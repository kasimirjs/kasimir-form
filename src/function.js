
/**
 *
 * @param selector
 * @return {KasimirForm}
 */
function ka_form(selector) {
    if (selector instanceof KasimirForm)
        return selector;
    let elem = document.getElementById(selector);
    if (elem === null)
        throw `Selector '${selector}' not found (no element mit id)`;
    if (elem instanceof KasimirForm) {
        return elem;
    }
    throw `Selector '${selector}' is not a <form is="ka-form"> element`;
}