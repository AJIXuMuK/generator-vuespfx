'use strict';

const Generator = require('yeoman-generator');
const chalk = require('chalk');
const yosay = require('yosay');
const path = require("path");
const fs = require('fs');
const _ = require('lodash');

const BCG = require('@microsoft/generator-sharepoint/lib/generators/component/BaseComponentGenerator')
const YeomanConfiguration = require("@microsoft/generator-sharepoint/lib/common/YeomanConfiguration");

const pkgJson = require('./vue-package.json');



module.exports = class extends Generator {
    constructor(args, opts) {
        super(args, opts);
        //
        // properties values for web part type of component
        //
        this.componentName = 'HelloWorld';
        this.componentClassName = 'HelloWorldWebPart';
        this.codeName = 'WebPart';
        this.folderName = 'webparts';
        this.componentType = 'webpart';
    }

    initializing() {
        this.log(yosay(
            chalk.white('Welcome to VueSPFx Custom Generator\n') +
            chalk.blue('based on\n') +
            chalk.blue.bold('SharePoint Client-side Solution Generator')
        ));
        this.log('Vue.js generator currently ignores componentType, extensionType, and Framework parameters');

        if (this.options.packageManager === 'pnpm') {
            this.log(chalk.red('VueSpfx generator doesn\'t support PNPM package manager because of incorrect installation of vue-loader module.\nUse NPM or YARN instead'));
            this.env.error();
        }

        /*this.config.set('componentType', 'webpart');

        const options = JSON.parse(JSON.stringify(this.options) || {});
        options.environment = 'spo';
        options.componentType = 'webpart';
        options.framework = 'none';

        this.composeWith(require.resolve(`@microsoft/generator-sharepoint/lib/generators/app`), options);*/

    }

    prompting() {
        return this.prompt([/*{
            type: 'list',
            name: 'environment',
            when: () => !this.config.get('environment'),
            message: 'Which baseline packages do you want to target for your component(s)?',
            default: 'spo',
            choices: [
                { name: 'SharePoint Online only (latest)', value: 'spo' },
                { name: 'SharePoint 2016 onwards, including SharePoint Online', value: 'onprem' }
            ]
        }, */{
                type: 'input',
                name: 'componentName',
                default: 'HelloWorld',
                message: 'What is your web part name?',
                validate: (input) => {
                    //
                    // copied from SPFx generator
                    //
                    const normalizedNames = BCG.normalizeComponentNames(input, this.codeName);
                    const outputFolderPath = this._getOutputFolder(normalizedNames.componentNameCamelCase);
                    if (this.fs.exists(outputFolderPath)) {
                        console.log(chalk.yellow(`\nThe folder "${outputFolderPath}" already exists.`
                            + ` Please choose a different name for your component.`));
                        return false;
                    }
                    // disallow quotes, since this will mess with the JSON we put this string into
                    if (input.indexOf('"') !== -1) {
                        console.log(chalk.yellow(`\nDo not use double quotes in your title.`));
                        return false;
                    }
                    return true;
                }
            }]).then((answers) => {
                const normalizedNames = BCG.normalizeComponentNames(answers.componentName, this.codeName);
                this.componentName = normalizedNames.componentNameCamelCase;
                this.componentClassName = normalizedNames.componentClassName;

                const options = JSON.parse(JSON.stringify(this.options) || {});
                options.framework = 'none';
                options.componentName = this.componentName;
                options.componentType = 'webpart';
                //options.environment = answers.environment;

                this.composeWith(
                    require.resolve(`@microsoft/generator-sharepoint/lib/generators/app`), options
                );
            });
    }

    install() {
        this.componentName = this.componentName;
        this.componentClassName = this.componentClassName;
        this._applyGulpConfig();
        this._copyComponent();
        this._copyShims();
        this._removeScssFile();
        this._updateWebPartCode();
        this._applyPackageJsonModifications();
        //this._installPackages();
    }

    _applyPackageJsonModifications() {
        const packageJsonContent = this.fs.readJSON(this.destinationPath('package.json'));
        const newPackageJsonContent = _.merge(packageJsonContent, pkgJson);
        fs.writeFileSync(this.destinationPath('package.json'), JSON.stringify(newPackageJsonContent, null, 4));
    }

    /**
     * updates gulpfile.js to process .vue files
     */
    _applyGulpConfig() {
        let gulpfileContent = this.fs.read(this.destinationPath('gulpfile.js'));

        gulpfileContent = gulpfileContent.replace(/build\.initialize\(gulp\);/gmi, `
var merge = require('webpack-merge');
const { VueLoaderPlugin } = require('vue-loader');

build.configureWebpack.mergeConfig({
    additionalConfiguration: (config) => {
        return merge(config, {
            plugins: [
                new VueLoaderPlugin()
            ],
            resolve: {
                alias: {
                    'vue$$': 'vue/dist/vue.esm.js'
                }
            },
            module: {
                rules: [{
                    test: /\\.vue$/,
                    use: [{
                        loader: 'vue-loader',
                        options: {
                            esModule: true,
                        }
                    }]
                }]
            }
        });
    }
});


let copyVueFiles = build.subTask('copy-vue-files', function (gulp, buildOptions, done) {
    return gulp.src(['src/**/*.vue'])
        .pipe(gulp.dest(buildOptions.libFolder))
});
build.rig.addPostTypescriptTask(copyVueFiles);
build.initialize(gulp);`);

        fs.writeFileSync(this.destinationPath('gulpfile.js'), gulpfileContent);
    }

    /**
     * installs npm packages for vue.js
     */
    _installPackages() {
        const done = this.async();

        switch (YeomanConfiguration.YeomanConfiguration.packageManager) {
            /*case 'npm':
                this.npmInstall(['vue', 'vue-class-component', 'vue-property-decorator'], { save: true });
                this.npmInstall(['css-loader', 'vue-loader', 'vue-template-compiler', 'webpack-merge'], { 'save-dev': true });
                break;
            case 'yarn':
                this.yarnInstall(['vue', 'vue-class-component', 'vue-property-decorator']);
                this.yarnInstall(['css-loader', 'vue-loader', 'vue-template-compiler', 'webpack-merge'], { dev: true });
                break;*/
            case 'pnpm':
                this.npmInstall(['vue', 'vue-class-component', 'vue-property-decorator'], { save: true });
                this.npmInstall(['css-loader', 'vue-loader', 'vue-template-compiler', 'webpack-merge'], { 'save-dev': true });
                break;
        }

        done();
    }

    _doPnpmInstall() {
        const installer = 'pnpm';
        const args = ['i', '-P', 'vue', 'vue-class-component', 'vue-property-decorator'];
        const devArgs = ['i', '-D', 'css-loader', 'vue-loader', 'vue-template-compiler', 'webpack-merge'];
        this.env.runLoop.add('install', (done) => {
            const depInstallResult = this.spawnCommandSync(installer, args);
            const devDepInstallResult = this.spawnCommandSync(installer, devArgs);
            if (depInstallResult.error || devDepInstallResult.error) {
                this.log(chalk.red('Could not finish installation. \n') +
                    'Please install ' + installer + ' with ' +
                    chalk.yellow('npm install -g ' + installer) + ' and try again.');
            }
            else {
                done();
            }
        });
    }

    /**
     * copies component for templates folder to destination
     */
    _copyComponent() {
        let scssContent = this.fs.read(this.templatePath('components/WebPart/WebPart.module.scss')).toString();
        scssContent = scssContent.replace(/\{WebPart\}/gm, this.componentClassName);
        this.fs.write(this.destinationPath(`src/webparts/${this.componentName}/components/${this.componentClassName}/${this.componentClassName}.module.scss`),
            scssContent);
        //this.fs.copy(this.templatePath('components/WebPart/WebPart.module.scss'),
        //    this.destinationPath(`src/webparts/${this.componentName}/components/${this.componentName}/${this.componentName}.module.scss`));

        let tsContent = this.fs.read(this.templatePath('components/WebPart/WebPart.ts')).toString();
        tsContent = tsContent.replace(/\{WebPart\}/gm, this.componentClassName);
        this.fs.write(this.destinationPath(`src/webparts/${this.componentName}/components/${this.componentClassName}/${this.componentClassName}.ts`),
            tsContent);
        //this.fs.copy(this.templatePath('components/WebPart/WebPart.ts'),
        //    this.destinationPath(`src/webparts/${this.componentName}/components/${this.componentName}/${this.componentName}.ts`));

        let vueContent = this.fs.read(this.templatePath('components/WebPart/WebPart.vue')).toString();
        vueContent = vueContent.replace(/\{WebPart\}/gm, this.componentClassName);
        this.fs.write(this.destinationPath(`src/webparts/${this.componentName}/components/${this.componentClassName}/${this.componentClassName}.vue`),
            vueContent);
        //this.fs.copy(this.templatePath('components/WebPart/WebPart.vue'),
        //    this.destinationPath(`src/webparts/${this.componentName}/components/${this.componentName}/${this.componentName}.vue`));
    }

    /**
     * copies shims file
     */
    _copyShims() {
        this.fs.copy(this.templatePath('vue-shims.d.ts'),
            this.destinationPath('src/vue-shims.d.ts'));
    }

    /**
     * gets web part folder in destination
     */
    _getOutputFolder(componentNameCamelCase) {
        return path.join(this.destinationRoot(), 'src', this.folderName, componentNameCamelCase);
    }

    /**
     * Updates web part code to use Vue component instead of HTML
     */
    _updateWebPartCode() {
        const webPartFilePath = this.destinationPath(`src/webparts/${this.componentName}/${this.componentClassName}.ts`);
        let webPartContent = this.fs.read(webPartFilePath);

        const regex = new RegExp(`^[ \\t]*import\\s+styles\\s*from\\s*[\\'\\"]\\.\\/${this.componentClassName}\\.module\\.scss[\\'\\"];`, 'gmi');

        webPartContent = webPartContent.replace(regex, '');

        const renderMatch = /\srender(\(|\s)/gmi.exec(webPartContent);
        const renderMethodOpenBraceIndex = webPartContent.indexOf('{', renderMatch.index);
        let renderMethodCloseBraceIndex = -1;

        let openBlocksCount = 1;
        for (let i = renderMethodOpenBraceIndex + 1, len = webPartContent.length; i < len; i++) {
            const symb = webPartContent[i];
            if (symb === '{') {
                openBlocksCount++;
            }
            else if (symb === '}') {
                openBlocksCount--;

                if (!openBlocksCount) {
                    renderMethodCloseBraceIndex = i;
                    break;
                }
            }
        }

        if (renderMethodCloseBraceIndex === -1) {
            throw new Error('Error updating web part code');
        }

        webPartContent = `${webPartContent.slice(0, renderMethodOpenBraceIndex + 1)}
    const id: string = \`wp-\${this.instanceId}\`;
    this.domElement.innerHTML = \`<div id="\${id}"></div>\`;

    let el = new Vue({
      el: \`#\${id}\`,
      render: h => h(${this.componentClassName}Component, {
        props: {
          description: this.properties.description
        }
      })
    });
  ${webPartContent.slice(renderMethodCloseBraceIndex)}`;

        webPartContent = `import Vue from 'vue';
import ${this.componentClassName}Component from './components/${this.componentClassName}/${this.componentClassName}.vue';
${webPartContent}`;

        fs.writeFileSync(webPartFilePath, webPartContent);
    }

    /**
     * Removes web part's scss file
     */
    _removeScssFile() {
        fs.unlinkSync(this.destinationPath(`src/webparts/${this.componentName}/${this.componentClassName}.module.scss`));
    }

}