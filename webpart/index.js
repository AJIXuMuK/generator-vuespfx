'use strict';

const BaseComponentGenerator = require('../component/BaseComponent');
const fs = require('fs');

module.exports = class extends BaseComponentGenerator {
    constructor(args, opts) {
        super(args, opts);

        this.friendlyName = 'Web Part';
        this.folderName = 'webparts';
        this.codeName = 'WebPart';
    }

    initializing() {
    }

    prompting() {
        return super.prompting(); /*.then(() => {
            const options = JSON.parse(JSON.stringify(this.options) || {});
            options.componentType = this.context.componentType;
            options.environment = this.context.environment;
            options.componentName = this.context.componentName;

            this.composeWith(
                require.resolve(`@microsoft/generator-sharepoint/lib/generators/app`), options
            );
        });*/
    }

    install() {
        this._copyComponent();
        this._removeScssFile();
        this._updateWebPartCode();
    }

    /**
     * copies component for templates folder to destination
     */
    _copyComponent() {
        super._copyCompenent('webparts', 'WebPart');
    }

    /**
     * Updates web part code to use Vue component instead of HTML
     */
    _updateWebPartCode() {
        const webPartFilePath = this.destinationPath(`src/webparts/${this.context.componentName}/${this.context.componentClassName}.ts`);
        let webPartContent = this.fs.read(webPartFilePath);

        const regex = new RegExp(`^[ \\t]*import\\s+styles\\s*from\\s*[\\'\\"]\\.\\/${this.context.componentClassName}\\.module\\.scss[\\'\\"];`, 'gmi');

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
      render: h => h(${this.context.componentClassName}Component, {
        props: {
          description: this.properties.description
        }
      })
    });
  ${webPartContent.slice(renderMethodCloseBraceIndex)}`;

        webPartContent = `import Vue from 'vue';
import ${this.context.componentClassName}Component from './components/${this.context.componentClassName}/${this.context.componentClassName}.vue';
${webPartContent}`;

        fs.writeFileSync(webPartFilePath, webPartContent);
    }

    /**
     * Removes web part's scss file
     */
    _removeScssFile() {
        super._removeScssFile('webparts');
    }
}