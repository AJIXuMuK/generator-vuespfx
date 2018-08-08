'use strict';

const BaseComponentGenerator = require('../component/BaseComponent');
const fs = require('fs');

module.exports = class extends BaseComponentGenerator {
    constructor(args, opts) {
        super(args, opts);
        this.friendlyName = 'Extension';
        this.folderName = 'extensions';
    }

    prompting() {
        return this.prompt([{
            type: 'list',
            name: 'extensionType',
            default: 'ApplicationCustomizer',
            when: () => !this.config.get('extensionType'),
            message: 'Which type of client-side extension to create?',
            choices: [
                {
                    name: 'Application Customizer',
                    value: 'ApplicationCustomizer'
                },
                {
                    name: 'Field Customizer',
                    value: 'FieldCustomizer'
                },
                {
                    name: 'ListView Command Set',
                    value: 'ListViewCommandSet'
                }
            ]
        }]).then((answers) => {
            const extensionType = answers.extensionType || this.context.extensionType;
            this.config.set('extensionType', extensionType);
            this.context.extensionType = extensionType;
            if (!(extensionType === 'FieldCustomizer' ||
                extensionType === 'ListViewCommandSet' ||
                extensionType === 'ApplicationCustomizer')) {
                this.log(colors.orange(`Invalid extensionType: "${extensionType}"`));
            }
            else {
                this.composeOptions.extensionType = extensionType;
                this.codeName =  extensionType === 'ListViewCommandSet' ? 'CommandSet' : extensionType;
                return super.prompting();
                /*const options = JSON.parse(JSON.stringify(this.options) || {});
                options.componentType = this.context.componentType;
                options.environment = this.context.environment;
                options.componentName = this.context.componentName;
                options.extensionType = extensionType;

                this.composeWith(
                    require.resolve(`@microsoft/generator-sharepoint/lib/generators/app`), options
                );*/
            }
        });
    }

    install() {

        if (this.context.extensionType === 'FieldCustomizer') {
            this._copyComponent();
            this._removeScssFile();
            this._updateFieldCustomizerCode();
        }
    }

    /**
     * copies component for templates folder to destination
     */
    _copyComponent() {
        super._copyCompenent('extensions', 'Extension');
    }

    /**
     * Updates extension code to use Vue component instead of HTML
     */
    _updateFieldCustomizerCode() {
        const extensionFilePath = this.destinationPath(`src/extensions/${this.context.componentName}/${this.context.componentClassName}.ts`);
        let extensionContent = this.fs.read(extensionFilePath);

        const regex = new RegExp(`^[ \\t]*import\\s+styles\\s*from\\s*[\\'\\"]\\.\\/${this.context.componentClassName}\\.module\\.scss[\\'\\"];`, 'gmi');

        extensionContent = extensionContent.replace(regex, '');

        const renderMatch = /\sonRenderCell(\(|\s)/gmi.exec(extensionContent);
        const renderMethodOpenBraceIndex = extensionContent.indexOf('{', renderMatch.index);
        let renderMethodCloseBraceIndex = -1;

        let openBlocksCount = 1;
        for (let i = renderMethodOpenBraceIndex + 1, len = extensionContent.length; i < len; i++) {
            const symb = extensionContent[i];
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
            throw new Error('Error updating extension code');
        }

        extensionContent = `${extensionContent.slice(0, renderMethodOpenBraceIndex + 1)}
    // Use this method to perform your custom cell rendering.
    const text: string = \`\${this.properties.sampleText}: \${event.fieldValue}\`;
    
    const id: string = \`fc-\${this.instanceId}\`;
    event.domElement.innerHTML = \`<div id="\${id}"></div>\`;

    let el = new Vue({
      el: \`#\${id}\`,
      render: h => h(${this.context.componentClassName}Component, {
        props: {
          text: text
        }
      })
    });
  ${extensionContent.slice(renderMethodCloseBraceIndex)}`;

        extensionContent = `import Vue from 'vue';
    import ${this.context.componentClassName}Component from './components/${this.context.componentClassName}/${this.context.componentClassName}.vue';
${extensionContent}`;

        fs.writeFileSync(extensionFilePath, extensionContent);
    }

    /**
     * Removes extension's scss file
     */
    _removeScssFile() {
        super._removeScssFile('extensions');
    }
}