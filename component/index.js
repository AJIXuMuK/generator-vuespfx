'use strict';

const Generator = require('yeoman-generator');

module.exports = class extends Generator {
    constructor(args, opts) {
        super(args, opts);
        this.context = opts.context || {};
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
    }

    prompting() {
        return this.prompt([{
            type: 'list',
            name: 'componentType',
            default: 'webpart',
            when: () => !this.context.componentType && !this.context.extensionType,
            message: 'Which type of client-side component to create?',
            choices: [
                {
                    name: 'WebPart',
                    value: 'webpart'
                },
                {
                    name: 'Extension',
                    value: 'extension'
                }
            ]
        }]).then((answers) => {
            const options = JSON.parse(JSON.stringify(this.options) || {});
            options.context = this.context;
            const componentType = answers.componentType || this.context.componentType;
            if (componentType === 'webpart') {
                this.config.set('componentType', 'webpart');
                this.context.componentType = 'webpart';
                this.composeWith(require.resolve('../webpart'), options);
            }
            else if (componentType === 'extension') {
                this.config.set('componentType', 'extension');
                this.context.componentType = 'extension';
                this.composeWith(require.resolve('../extension'), options);
            }
            else {
                this.log(colors.orange(`Invalid componentType: "${componentType}"`));
                if (this.context.extensionType) {
                    this.log(colors.orange(`Invalid extensionType: "${this.config.get('extensionType')}"`));
                }
            }
        });
    }

    install() {
    }
}