'use strict';

const Generator = require('yeoman-generator');
const chalk = require('chalk');
const yosay = require('yosay');
const path = require("path");
const fs = require('fs');

const BCG = require('@microsoft/generator-sharepoint/lib/generators/component/BaseComponentGenerator')



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
    }

    prompting() {
        return this.prompt([{
            type: 'input',
            name: 'componentName',
            default: 'HelloWorld',
            message: 'What is your web part name?',
            validate: (input) => {
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
            this.composeWith(
                require.resolve(`@microsoft/generator-sharepoint/lib/generators/app`), {
                    'skip-install': false,
                    'framework': 'none',
                    'componentName': this.componentName,
                    'componentType': this.componentType
                }
            );
        });
    }

    install() {
        this._applyGulpConfig();
        this._copyComponent();
        this._copyShims();
        this._updateWebPartCode();
        this._installPackages();
    }

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

    _installPackages() {
        const done = this.async();
        this.npmInstall(['vue', 'vue-class-component', 'vue-property-decorator'], ['--save']);
        this.npmInstall(['vue-loader', 'vue-template-compiler', 'webpack-merge'], ['--save-dev']);
        done();
    }

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

    _copyShims() {
        this.fs.copy(this.templatePath('vue-shims.d.ts'),
            this.destinationPath('src/vue-shims.d.ts'));
    }

    _getOutputFolder(componentNameCamelCase) {
        return path.join(this.destinationRoot(), 'src', this.folderName, componentNameCamelCase);
    }


    _updateWebPartCode() {
        const webPartFilePath = this.destinationPath(`src/webparts/${this.componentName}/${this.componentClassName}.ts`);
        let webPartContent = this.fs.read(webPartFilePath);

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

}