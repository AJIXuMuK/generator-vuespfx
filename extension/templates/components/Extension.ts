import { Vue, Component, Prop, Provide } from 'vue-property-decorator';
import styles from './{Extension}.module.scss';

/**
 * Component's properties
 */
export interface I{Extension}Props {
    text: string;
}

/**
 * Class-component
 */
@Component
export default class {Extension} extends Vue implements I{Extension}Props {

    /**
     * implementing ISimpleWebPartProps interface
     */
    @Prop()
    public text: string;

    /**
     * Readonly property to return styles
     */
    public get styles(): { [key: string]: string } {
        return styles;
    }
}