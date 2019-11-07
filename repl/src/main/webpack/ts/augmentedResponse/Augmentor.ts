/**
 * A converter from alternative evaluation responses sent by the server into
 * an HTML representation.
 */
export default interface Augmentor {
    /** Can this Augmentor augment the given evaluation output? */
    canAugment(data: AugmentedOutput): boolean;

    /** Augment this evaluation output into an HTML element. */
    augment(data: AugmentedOutput): HTMLElement;
}