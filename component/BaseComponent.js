'use strict';

const Generator = require('yeoman-generator');
const path = require("path");
const BCG = require('@microsoft/generator-sharepoint/lib/generators/component/BaseComponentGenerator');
const fs = require('fs');
const _ = require('lodash');

module.exports = class extends Generator {
    constructor(args, opts) {
        super(args, opts);
        this.context = opts.context || {};
        this.friendlyName = '';
        this.folderName = '';
        this.codeName = '';
        this.composeOptions = {
            nested: true
        };
    }
    prompting() {
        return this.prompt({
            type: 'input',
            name: 'componentName',
            default: 'HelloWorld',
            when: () => !this.config.get('componentName'),
            message: `What is your ${this.friendlyName} name?`,
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
            // required: true
        }).then((answers) => {
            const normalizedNames = BCG.normalizeComponentNames(this.context.componentName || answers.componentName, this.codeName);
            this.context.componentNameUnescaped = normalizedNames.componentNameUnescaped;
            this.context.componentName = normalizedNames.componentName;
            this.context.componentNameCamelCase = normalizedNames.componentNameCamelCase;
            this.context.componentClassName = normalizedNames.componentClassName;
            this.context.componentStrings = normalizedNames.componentStrings;
            this.context.componentClassNameKebabCase = normalizedNames.componentClassNameKebabCase;
            this.context.componentAlias = normalizedNames.componentAlias;
            // the folder where we will drop the information
            const outputFolderPath = this._getOutputFolder(this.context.componentNameCamelCase);
            if (fs.existsSync(outputFolderPath)) {
                throw new Error(`The folder "${outputFolderPath}" already exists.`
                    + ` Please choose a different name for your component.`);
            }

            this.composeOptions.componentType = this.context.componentType;
            this.composeOptions.environment = this.context.environment;
            this.composeOptions.componentName = this.context.componentName;

            let options = JSON.parse(JSON.stringify(this.options) || {});
            options = _.merge(options, this.composeOptions);
            this.composeWith(
                require.resolve(`@microsoft/generator-sharepoint/lib/generators/app`), options
            );

        });
    }

    /**
     * gets web part folder in destination
     */
    _getOutputFolder(componentNameCamelCase) {
        return path.join(this.destinationRoot(), 'src', this.folderName, componentNameCamelCase);
    }

    /**
     * Removes scss file
     */
    _removeScssFile(componentTypePath) {
        fs.unlinkSync(this.destinationPath(`src/${componentTypePath}/${this.context.componentName}/${this.context.componentClassName}.module.scss`));
    }

    /**
     * copies component for templates folder to destination
     */
    _copyCompenent(componentTypePath, componentType) {
        let scssContent = this.fs.read(this.templatePath(`components/${componentType}.module.scss`)).toString();
        const replacementRegExp = new RegExp(`{${componentType}}`, 'gm');
        scssContent = scssContent.replace(replacementRegExp, this.context.componentClassName);
        this.fs.write(this.destinationPath(`src/${componentTypePath}/${this.context.componentNameCamelCase}/components/${this.context.componentClassName}/${this.context.componentClassName}.module.scss`),
            scssContent);
        
        let tsContent = this.fs.read(this.templatePath(`components/${componentType}.ts`)).toString();
        replacementRegExp.lastIndex = 0;
        tsContent = tsContent.replace(replacementRegExp, this.context.componentClassName);
        this.fs.write(this.destinationPath(`src/${componentTypePath}/${this.context.componentNameCamelCase}/components/${this.context.componentClassName}/${this.context.componentClassName}.ts`),
            tsContent);

        let vueContent = this.fs.read(this.templatePath(`components/${componentType}.vue`)).toString();
        replacementRegExp.lastIndex = 0;
        vueContent = vueContent.replace(replacementRegExp, this.context.componentClassName);
        this.fs.write(this.destinationPath(`src/${componentTypePath}/${this.context.componentNameCamelCase}/components/${this.context.componentClassName}/${this.context.componentClassName}.vue`),
            vueContent);
    }
}