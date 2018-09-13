'use strict';

const Generator = require('yeoman-generator');
const chalk = require('chalk');
const yosay = require('yosay');
const path = require("path");
const fs = require('fs');
const _ = require('lodash');
const YeomanConfiguration = require("@microsoft/generator-sharepoint/lib/common/YeomanConfiguration");

const pkgJson = require('./vue-package.json');



module.exports = class extends Generator {
    constructor(args, opts) {
        super(args, opts);

        this.context = {};
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

        if (this.options.environment !== undefined) {
            this.config.set('environment', this.options.environment);
            this.context.environment = this.options.environment;
        }
        if (this.options.packageManager !== undefined) {
            this.config.set('packageManager', this.options.packageManager);
            this.context.packageManager = this.options.packageManager;
        }
        if (this.options.componentType !== undefined) {
            this.config.set('componentType', this.options.environment === 'onprem' ? 'webpart' : this.options.componentType);
            this.context.componentType = this.config.get('componentType');
        }
        else {
            this.config.set('componentType', undefined);
        }
        if (this.options.extensionType !== undefined) {
            this.config.set('extensionType', this.options.extensionType);
            this.context.extensionType = this.options.extensionType;
        }
        else {
            this.config.set('extensionType', undefined);
        }
        if (this.options.componentName !== undefined) {
            this.config.set('componentName', this.options.componentName);
            this.context.componentName = this.options.componentName;
        }
        else {
            this.config.set('componentName', undefined);
        }

    }

    prompting() {
        return this.prompt([{
            type: 'list',
            name: 'environment',
            when: () => !this.config.get('environment'),
            message: 'Which baseline packages do you want to target for your component(s)?',
            default: 'spo',
            choices: [
                { name: 'SharePoint Online only (latest)', value: 'spo' },
                { name: 'SharePoint 2016 onwards, including SharePoint Online', value: 'onprem' }
            ]
        }]).then((answers) => {
                if (!this.config.get('environment')) {
                    this.config.set('environment', answers.environment);
                    this.context.environment = answers.environment;
                }

                const options = JSON.parse(JSON.stringify(this.options) || {});
                options.framework = 'none';
                options.context = this.context;

                this.composeWith(require.resolve('../component'), options);
            });
    }

    install() {
        this._applyGulpConfig();
        this._copyShims();
        this._applyPackageJsonModifications();
    }

    _applyPackageJsonModifications() {
        const packageJsonContent = this.fs.readJSON(this.destinationPath('package.json'));
        if (this._isPackageJsonModified(packageJsonContent)) {
            return;
        }
        const newPackageJsonContent = _.merge(packageJsonContent, pkgJson);
        fs.writeFileSync(this.destinationPath('package.json'), JSON.stringify(newPackageJsonContent, null, 4));
    }

    _isPackageJsonModified(packageJsonContent) {
        return !!packageJsonContent.dependencies.vue;
    }

    /**
     * updates gulpfile.js to process .vue files
     */
    _applyGulpConfig() {
        let gulpfileContent = this.fs.read(this.destinationPath('gulpfile.js'));

        if (gulpfileContent.indexOf(`build.subTask('copy-vue-files'`) !== -1) {
            return;
        }

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

    /**
     * copies shims file
     */
    _copyShims() {
        if (this.fs.exists(this.destinationPath('src/vue-shims.d.ts'))) {
            return;
        }

        this.fs.copy(this.templatePath('vue-shims.d.ts'),
            this.destinationPath('src/vue-shims.d.ts'));
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


}