import { Vue, Component, Prop, Provide } from 'vue-property-decorator';
import styles from './{WebPart}.module.scss';

/**
 * Component's properties
 */
export interface I{WebPart}Props {
    description: string;
}

/**
 * Class-component
 */
@Component
export default class {WebPart} extends Vue implements I{WebPart}Props {

    /**
     * implementing ISimpleWebPartProps interface
     */
    @Prop()
    public description: string;

    /**
     * Readonly property to return styles
     */
    public get styles(): { [key: string]: string } {
        return styles;
    }
}