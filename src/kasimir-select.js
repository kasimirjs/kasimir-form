
class KasimirSelect extends HTMLSelectElement {


    constructor() {
        super();
        this.__$options = [];
    }


    _updateOptions() {
        //console.log("updateOptions()");
        let val_key = "value";
        let text_key = "text";
        if (this.hasAttribute("value_key"))
            val_key = this.getAttribute("value_key");
        if (this.hasAttribute("text_key"))
            text_key = this.getAttribute("text_key");

        this.innerHTML = "";
        for(let option of this.__$options) {
            let optEl = document.createElement("option");
            if (typeof option === "object") {
                optEl.value = option[val_key];
                optEl.innerText = option[text_key];
            } else {
                optEl.value = option;
                optEl.innerText = option;
            }
            this.appendChild(optEl);
        }
    }


    connectedCallback() {
        let iniOptions = this.$options;
        let value = this.$value;

        // Getters / Setters not possible if property already defined.
        // This happens if element is loaded before js
        // Therefor: apply only on connect and keep the property value
        Object.defineProperty(this, '$options', {
            set: (val) => {
                this.__$options = val;
                this._updateOptions();
            },
            get: (val) => {
                return this.__$options
            }
        });
        Object.defineProperty(this, '$value', {
            set: (val) => {
                this.value = val;
            },
            get: (val) => {
                return this.value;
            }
        });
        if (typeof iniOptions !== "undefined")
            this.$options = iniOptions;
        if (typeof value !== "undefined")
            this.$value = value;

        if (this.hasAttribute("init")) {
            let code = this.getAttribute("init")
            try {
                eval(code);
            } catch  (e) {
                console.error(e, this);
                throw new Error(`eval("${code}") failed: ${e}`);
            }
        }
    }


}

customElements.define("ka-select", KasimirSelect, {extends: "select"});