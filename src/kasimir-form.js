



class KasimirForm extends HTMLFormElement {


    constructor() {
        super();
        this._data = {};
        this.params = {
            "debounce": 200
        };
        this._debounder = null;
        this._formEls = [];
        this._observer = new MutationObserver((e) => {
            this._formEls.length = 0;
            for (let el of this.querySelectorAll("input,select,textarea")) {
                this._formEls.push(el);
                if (el._kasiFormI === true)
                    continue;
                el._kasiFormI = true;
                if (el instanceof HTMLSelectElement) {
                    el.addEventListener("change", (e) => {
                        this.dispatchEvent(new Event("change"));
                    });
                } else {
                    el.addEventListener("keyup", (e) => {
                        window.clearTimeout(this._debounder);
                        if (e.key === "Enter") {
                            return;
                        }
                        this._debounder = window.setTimeout(() => {this.dispatchEvent(new Event("change"))}, this.params.debounce)
                    })
                }
            }
        });
        this._observer.observe(this, {childList: true, subtree: true});

        var self = this;
        this.addEventListener("submit", (e) => {
            e.stopPropagation();
            e.preventDefault();
        });
    }

    /**
     * Get the form data as object with key-value pair
     *
     * ```
     * Example:
     *
     * let data = ka_form("formId").data;
     * for (let key in data)
     *      console.log (`data[${name}]=${data[name]}`);
     * ```
     *
     * @return {object}
     */
    get data() {
        let getVal = (el) => {
            switch (el.tagName) {
                case "INPUT":
                    switch (el.type) {
                        case "checkbox":
                        case "radio":
                            if (el.checked == true)
                                return el.value;
                            return null;
                    }
                case "SELECT":
                case "TEXTAREA":
                    return el.value;
            }
        };

        for (let el of this._formEls) {
            if (el.name === "")
                continue;
            this._data[el.name] = getVal(el);
        }
        return this._data;
    }

    /**
     * Set the data form form as object
     *
     * ```
     * ka_form("formId").data = {
     *     "name1": "val1"
     * }
     * ```
     *
     * @param {object} newData
     */
    set data (newData) {
        this._data = newData;
        for (let el of this._formEls) {
            switch (form.tagName) {
                case "INPUT":
                    switch (form.type) {
                        case "checkbox":
                        case "radio":
                            if (newValue == form.value) {
                                form.checked = true;
                            } else {
                                form.checked = false;
                            }
                            return;
                    }
                case "SELECT":
                case "TEXTAREA":
                    form.value = newValue;
                    break;
            }
        }
    }

    disconnectedCallback() {
        this._observer.disconnect();
    }

    connectedCallback() {
        console.log("connected", this.outerHTML);
    }


}

customElements.define("ka-form", KasimirForm, {extends: "form"});