
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




class KasimirForm extends HTMLFormElement {


    constructor() {
        super();
        this._data = {};
        this.params = {
            "debounce": 200
        };
        this._debounder = null;
        this._formEls = [];

        var self = this;
        this.addEventListener("submit", (e) => {
            e.stopPropagation();
            e.preventDefault();
        });
    }


    _updateElCon() {
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
    get $data() {
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
    set $data (newData) {
        this._data = newData;
        for (let el of this._formEls) {
            let cdata = newData[el.name];
            if (typeof cdata === "undefined")
                cdata = "";
            if (el.tagName === "INPUT" && el.type === "checkbox" || el.type === "radio") {
                if (cdata === el.value) {
                    el.checked = true;
                } else {
                    el.checked = false;
                }
            } else {
                el.value = cdata;
            }
        }
    }

    disconnectedCallback() {
        this._observer.disconnect();
    }

    connectedCallback() {
        this._observer = new MutationObserver((e) => {
            this._updateElCon();
        });
        this._observer.observe(this, {childList: true, subtree: true});
        this._updateElCon();
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

customElements.define("ka-form", KasimirForm, {extends: "form"});

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZ1bmN0aW9uLmpzIiwia2FzaW1pci1mb3JtLmpzIiwia2FzaW1pci1zZWxlY3QuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoia2FzaW1pci1mb3JtLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG4vKipcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqIEByZXR1cm4ge0thc2ltaXJGb3JtfVxuICovXG5mdW5jdGlvbiBrYV9mb3JtKHNlbGVjdG9yKSB7XG4gICAgaWYgKHNlbGVjdG9yIGluc3RhbmNlb2YgS2FzaW1pckZvcm0pXG4gICAgICAgIHJldHVybiBzZWxlY3RvcjtcbiAgICBsZXQgZWxlbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHNlbGVjdG9yKTtcbiAgICBpZiAoZWxlbSA9PT0gbnVsbClcbiAgICAgICAgdGhyb3cgYFNlbGVjdG9yICcke3NlbGVjdG9yfScgbm90IGZvdW5kIChubyBlbGVtZW50IG1pdCBpZClgO1xuICAgIGlmIChlbGVtIGluc3RhbmNlb2YgS2FzaW1pckZvcm0pIHtcbiAgICAgICAgcmV0dXJuIGVsZW07XG4gICAgfVxuICAgIHRocm93IGBTZWxlY3RvciAnJHtzZWxlY3Rvcn0nIGlzIG5vdCBhIDxmb3JtIGlzPVwia2EtZm9ybVwiPiBlbGVtZW50YDtcbn0iLCJcblxuXG5cbmNsYXNzIEthc2ltaXJGb3JtIGV4dGVuZHMgSFRNTEZvcm1FbGVtZW50IHtcblxuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMuX2RhdGEgPSB7fTtcbiAgICAgICAgdGhpcy5wYXJhbXMgPSB7XG4gICAgICAgICAgICBcImRlYm91bmNlXCI6IDIwMFxuICAgICAgICB9O1xuICAgICAgICB0aGlzLl9kZWJvdW5kZXIgPSBudWxsO1xuICAgICAgICB0aGlzLl9mb3JtRWxzID0gW107XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoXCJzdWJtaXRcIiwgKGUpID0+IHtcbiAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuXG4gICAgX3VwZGF0ZUVsQ29uKCkge1xuICAgICAgICBmb3IgKGxldCBlbCBvZiB0aGlzLnF1ZXJ5U2VsZWN0b3JBbGwoXCJpbnB1dCxzZWxlY3QsdGV4dGFyZWFcIikpIHtcblxuICAgICAgICAgICAgdGhpcy5fZm9ybUVscy5wdXNoKGVsKTtcbiAgICAgICAgICAgIGlmIChlbC5fa2FzaUZvcm1JID09PSB0cnVlKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgZWwuX2thc2lGb3JtSSA9IHRydWU7XG4gICAgICAgICAgICBpZiAoZWwgaW5zdGFuY2VvZiBIVE1MU2VsZWN0RWxlbWVudCkge1xuICAgICAgICAgICAgICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgKGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudChcImNoYW5nZVwiKSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KHRoaXMuX2RlYm91bmRlcik7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlLmtleSA9PT0gXCJFbnRlclwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZGVib3VuZGVyID0gd2luZG93LnNldFRpbWVvdXQoKCkgPT4ge3RoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoXCJjaGFuZ2VcIikpfSwgdGhpcy5wYXJhbXMuZGVib3VuY2UpXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuXG5cbiAgICAvKipcbiAgICAgKiBHZXQgdGhlIGZvcm0gZGF0YSBhcyBvYmplY3Qgd2l0aCBrZXktdmFsdWUgcGFpclxuICAgICAqXG4gICAgICogYGBgXG4gICAgICogRXhhbXBsZTpcbiAgICAgKlxuICAgICAqIGxldCBkYXRhID0ga2FfZm9ybShcImZvcm1JZFwiKS5kYXRhO1xuICAgICAqIGZvciAobGV0IGtleSBpbiBkYXRhKVxuICAgICAqICAgICAgY29uc29sZS5sb2cgKGBkYXRhWyR7bmFtZX1dPSR7ZGF0YVtuYW1lXX1gKTtcbiAgICAgKiBgYGBcbiAgICAgKlxuICAgICAqIEByZXR1cm4ge29iamVjdH1cbiAgICAgKi9cbiAgICBnZXQgJGRhdGEoKSB7XG4gICAgICAgIGxldCBnZXRWYWwgPSAoZWwpID0+IHtcbiAgICAgICAgICAgIHN3aXRjaCAoZWwudGFnTmFtZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgXCJJTlBVVFwiOlxuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKGVsLnR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJjaGVja2JveFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcInJhZGlvXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVsLmNoZWNrZWQgPT0gdHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVsLnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FzZSBcIlNFTEVDVFwiOlxuICAgICAgICAgICAgICAgIGNhc2UgXCJURVhUQVJFQVwiOlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZWwudmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgZm9yIChsZXQgZWwgb2YgdGhpcy5fZm9ybUVscykge1xuICAgICAgICAgICAgaWYgKGVsLm5hbWUgPT09IFwiXCIpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB0aGlzLl9kYXRhW2VsLm5hbWVdID0gZ2V0VmFsKGVsKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fZGF0YTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTZXQgdGhlIGRhdGEgZm9ybSBmb3JtIGFzIG9iamVjdFxuICAgICAqXG4gICAgICogYGBgXG4gICAgICoga2FfZm9ybShcImZvcm1JZFwiKS5kYXRhID0ge1xuICAgICAqICAgICBcIm5hbWUxXCI6IFwidmFsMVwiXG4gICAgICogfVxuICAgICAqIGBgYFxuICAgICAqXG4gICAgICogQHBhcmFtIHtvYmplY3R9IG5ld0RhdGFcbiAgICAgKi9cbiAgICBzZXQgJGRhdGEgKG5ld0RhdGEpIHtcbiAgICAgICAgdGhpcy5fZGF0YSA9IG5ld0RhdGE7XG4gICAgICAgIGZvciAobGV0IGVsIG9mIHRoaXMuX2Zvcm1FbHMpIHtcbiAgICAgICAgICAgIGxldCBjZGF0YSA9IG5ld0RhdGFbZWwubmFtZV07XG4gICAgICAgICAgICBpZiAodHlwZW9mIGNkYXRhID09PSBcInVuZGVmaW5lZFwiKVxuICAgICAgICAgICAgICAgIGNkYXRhID0gXCJcIjtcbiAgICAgICAgICAgIGlmIChlbC50YWdOYW1lID09PSBcIklOUFVUXCIgJiYgZWwudHlwZSA9PT0gXCJjaGVja2JveFwiIHx8IGVsLnR5cGUgPT09IFwicmFkaW9cIikge1xuICAgICAgICAgICAgICAgIGlmIChjZGF0YSA9PT0gZWwudmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwuY2hlY2tlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZWwuY2hlY2tlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZWwudmFsdWUgPSBjZGF0YTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGRpc2Nvbm5lY3RlZENhbGxiYWNrKCkge1xuICAgICAgICB0aGlzLl9vYnNlcnZlci5kaXNjb25uZWN0KCk7XG4gICAgfVxuXG4gICAgY29ubmVjdGVkQ2FsbGJhY2soKSB7XG4gICAgICAgIHRoaXMuX29ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoKGUpID0+IHtcbiAgICAgICAgICAgIHRoaXMuX3VwZGF0ZUVsQ29uKCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLl9vYnNlcnZlci5vYnNlcnZlKHRoaXMsIHtjaGlsZExpc3Q6IHRydWUsIHN1YnRyZWU6IHRydWV9KTtcbiAgICAgICAgdGhpcy5fdXBkYXRlRWxDb24oKTtcbiAgICAgICAgaWYgKHRoaXMuaGFzQXR0cmlidXRlKFwiaW5pdFwiKSkge1xuICAgICAgICAgICAgbGV0IGNvZGUgPSB0aGlzLmdldEF0dHJpYnV0ZShcImluaXRcIilcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgZXZhbChjb2RlKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlLCB0aGlzKTtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGV2YWwoXCIke2NvZGV9XCIpIGZhaWxlZDogJHtlfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoXCJrYS1mb3JtXCIsIEthc2ltaXJGb3JtLCB7ZXh0ZW5kczogXCJmb3JtXCJ9KTsiLCJcbmNsYXNzIEthc2ltaXJTZWxlY3QgZXh0ZW5kcyBIVE1MU2VsZWN0RWxlbWVudCB7XG5cblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLl9fJG9wdGlvbnMgPSBbXTtcbiAgICB9XG5cblxuICAgIF91cGRhdGVPcHRpb25zKCkge1xuICAgICAgICAvL2NvbnNvbGUubG9nKFwidXBkYXRlT3B0aW9ucygpXCIpO1xuICAgICAgICBsZXQgdmFsX2tleSA9IFwidmFsdWVcIjtcbiAgICAgICAgbGV0IHRleHRfa2V5ID0gXCJ0ZXh0XCI7XG4gICAgICAgIGlmICh0aGlzLmhhc0F0dHJpYnV0ZShcInZhbHVlX2tleVwiKSlcbiAgICAgICAgICAgIHZhbF9rZXkgPSB0aGlzLmdldEF0dHJpYnV0ZShcInZhbHVlX2tleVwiKTtcbiAgICAgICAgaWYgKHRoaXMuaGFzQXR0cmlidXRlKFwidGV4dF9rZXlcIikpXG4gICAgICAgICAgICB0ZXh0X2tleSA9IHRoaXMuZ2V0QXR0cmlidXRlKFwidGV4dF9rZXlcIik7XG5cbiAgICAgICAgdGhpcy5pbm5lckhUTUwgPSBcIlwiO1xuICAgICAgICBmb3IobGV0IG9wdGlvbiBvZiB0aGlzLl9fJG9wdGlvbnMpIHtcbiAgICAgICAgICAgIGxldCBvcHRFbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJvcHRpb25cIik7XG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbiA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgICAgIG9wdEVsLnZhbHVlID0gb3B0aW9uW3ZhbF9rZXldO1xuICAgICAgICAgICAgICAgIG9wdEVsLmlubmVyVGV4dCA9IG9wdGlvblt0ZXh0X2tleV07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG9wdEVsLnZhbHVlID0gb3B0aW9uO1xuICAgICAgICAgICAgICAgIG9wdEVsLmlubmVyVGV4dCA9IG9wdGlvbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuYXBwZW5kQ2hpbGQob3B0RWwpO1xuICAgICAgICB9XG4gICAgfVxuXG5cbiAgICBjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICAgICAgbGV0IGluaU9wdGlvbnMgPSB0aGlzLiRvcHRpb25zO1xuICAgICAgICBsZXQgdmFsdWUgPSB0aGlzLiR2YWx1ZTtcblxuICAgICAgICAvLyBHZXR0ZXJzIC8gU2V0dGVycyBub3QgcG9zc2libGUgaWYgcHJvcGVydHkgYWxyZWFkeSBkZWZpbmVkLlxuICAgICAgICAvLyBUaGlzIGhhcHBlbnMgaWYgZWxlbWVudCBpcyBsb2FkZWQgYmVmb3JlIGpzXG4gICAgICAgIC8vIFRoZXJlZm9yOiBhcHBseSBvbmx5IG9uIGNvbm5lY3QgYW5kIGtlZXAgdGhlIHByb3BlcnR5IHZhbHVlXG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnJG9wdGlvbnMnLCB7XG4gICAgICAgICAgICBzZXQ6ICh2YWwpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9fJG9wdGlvbnMgPSB2YWw7XG4gICAgICAgICAgICAgICAgdGhpcy5fdXBkYXRlT3B0aW9ucygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldDogKHZhbCkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9fJG9wdGlvbnNcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnJHZhbHVlJywge1xuICAgICAgICAgICAgc2V0OiAodmFsKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy52YWx1ZSA9IHZhbDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXQ6ICh2YWwpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy52YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmICh0eXBlb2YgaW5pT3B0aW9ucyAhPT0gXCJ1bmRlZmluZWRcIilcbiAgICAgICAgICAgIHRoaXMuJG9wdGlvbnMgPSBpbmlPcHRpb25zO1xuICAgICAgICBpZiAodHlwZW9mIHZhbHVlICE9PSBcInVuZGVmaW5lZFwiKVxuICAgICAgICAgICAgdGhpcy4kdmFsdWUgPSB2YWx1ZTtcblxuICAgICAgICBpZiAodGhpcy5oYXNBdHRyaWJ1dGUoXCJpbml0XCIpKSB7XG4gICAgICAgICAgICBsZXQgY29kZSA9IHRoaXMuZ2V0QXR0cmlidXRlKFwiaW5pdFwiKVxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBldmFsKGNvZGUpO1xuICAgICAgICAgICAgfSBjYXRjaCAgKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGUsIHRoaXMpO1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgZXZhbChcIiR7Y29kZX1cIikgZmFpbGVkOiAke2V9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cblxufVxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoXCJrYS1zZWxlY3RcIiwgS2FzaW1pclNlbGVjdCwge2V4dGVuZHM6IFwic2VsZWN0XCJ9KTsiXX0=