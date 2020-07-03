
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

        /**
         * The last event that was triggered
         * @type {Event|null}
         */
        this.$event = null;

        this._skipSendChangeEvt = false;

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
            if (el instanceof HTMLSelectElement || (el instanceof HTMLInputElement && el.type === "checkbox") ) {
                el.addEventListener("change", (e) => {
                    if (this._skipSendChangeEvt)
                        return;

                    this.$event = e;

                    // dispatch the original event in form element
                    // as you can not dispatch an event twice, create a new one.
                    this.dispatchEvent(new Event("change"));
                });
            } else {
                el.addEventListener("keyup", (e) => {
                    window.clearTimeout(this._debounder);
                    if (e.key === "Enter") {
                        return;
                    }
                    this._debounder = window.setTimeout(() => {
                        this.$event = e;

                        this.dispatchEvent(new Event("change"))
                    }, this.params.debounce)
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
        let data = {};

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
            if (el.name.endsWith("[]")) {
                // Process Array input
                let name = el.name.slice(0, -2);
                if ( ! Array.isArray(data[name]))
                    data[name] = [];
                data[name].push(getVal(el));
            } else {
                data[el.name] = getVal(el);
            }

        }
        return data;
    }

    /**
     * Set the data form form as object
     *
     * ```
     * ka_form("formId").$data = {
     *     "name1": "val1"
     * }
     * ```
     *
     * @param {object} newData
     */
    set $data (newData) {
        // Skip sending onchange event on $data update
        this._skipSendChangeEvt = true;

        let cdata, name = null;
        let arrIndex = {};

        this._data = newData;
        for (let el of this._formEls) {
            name = el.name;

            if (name.endsWith("[]")) {
                name = name.slice(0, -2);
                if (typeof arrIndex[name] === "undefined")
                    arrIndex[name] = 0;
                cdata = newData[name];
                if (Array.isArray(cdata)) {
                    cdata = cdata[arrIndex[name]++];
                } else {
                    cdata = "";
                }
            } else {
                let name = el.name;
                let cdata = newData[name];
            }

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
        this._skipSendChangeEvt = false;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZ1bmN0aW9uLmpzIiwia2FzaW1pci1mb3JtLmpzIiwia2FzaW1pci1zZWxlY3QuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMvTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6Imthc2ltaXItZm9ybS5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxuLyoqXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiBAcmV0dXJuIHtLYXNpbWlyRm9ybX1cbiAqL1xuZnVuY3Rpb24ga2FfZm9ybShzZWxlY3Rvcikge1xuICAgIGlmIChzZWxlY3RvciBpbnN0YW5jZW9mIEthc2ltaXJGb3JtKVxuICAgICAgICByZXR1cm4gc2VsZWN0b3I7XG4gICAgbGV0IGVsZW0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChzZWxlY3Rvcik7XG4gICAgaWYgKGVsZW0gPT09IG51bGwpXG4gICAgICAgIHRocm93IGBTZWxlY3RvciAnJHtzZWxlY3Rvcn0nIG5vdCBmb3VuZCAobm8gZWxlbWVudCBtaXQgaWQpYDtcbiAgICBpZiAoZWxlbSBpbnN0YW5jZW9mIEthc2ltaXJGb3JtKSB7XG4gICAgICAgIHJldHVybiBlbGVtO1xuICAgIH1cbiAgICB0aHJvdyBgU2VsZWN0b3IgJyR7c2VsZWN0b3J9JyBpcyBub3QgYSA8Zm9ybSBpcz1cImthLWZvcm1cIj4gZWxlbWVudGA7XG59IiwiXG5cblxuXG5jbGFzcyBLYXNpbWlyRm9ybSBleHRlbmRzIEhUTUxGb3JtRWxlbWVudCB7XG5cblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLl9kYXRhID0ge307XG4gICAgICAgIHRoaXMucGFyYW1zID0ge1xuICAgICAgICAgICAgXCJkZWJvdW5jZVwiOiAyMDBcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5fZGVib3VuZGVyID0gbnVsbDtcbiAgICAgICAgdGhpcy5fZm9ybUVscyA9IFtdO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaGUgbGFzdCBldmVudCB0aGF0IHdhcyB0cmlnZ2VyZWRcbiAgICAgICAgICogQHR5cGUge0V2ZW50fG51bGx9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLiRldmVudCA9IG51bGw7XG5cbiAgICAgICAgdGhpcy5fc2tpcFNlbmRDaGFuZ2VFdnQgPSBmYWxzZTtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihcInN1Ym1pdFwiLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG5cbiAgICBfdXBkYXRlRWxDb24oKSB7XG4gICAgICAgIGZvciAobGV0IGVsIG9mIHRoaXMucXVlcnlTZWxlY3RvckFsbChcImlucHV0LHNlbGVjdCx0ZXh0YXJlYVwiKSkge1xuXG4gICAgICAgICAgICB0aGlzLl9mb3JtRWxzLnB1c2goZWwpO1xuICAgICAgICAgICAgaWYgKGVsLl9rYXNpRm9ybUkgPT09IHRydWUpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICBlbC5fa2FzaUZvcm1JID0gdHJ1ZTtcbiAgICAgICAgICAgIGlmIChlbCBpbnN0YW5jZW9mIEhUTUxTZWxlY3RFbGVtZW50IHx8IChlbCBpbnN0YW5jZW9mIEhUTUxJbnB1dEVsZW1lbnQgJiYgZWwudHlwZSA9PT0gXCJjaGVja2JveFwiKSApIHtcbiAgICAgICAgICAgICAgICBlbC5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLl9za2lwU2VuZENoYW5nZUV2dClcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAgICAgICAgICAgICB0aGlzLiRldmVudCA9IGU7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gZGlzcGF0Y2ggdGhlIG9yaWdpbmFsIGV2ZW50IGluIGZvcm0gZWxlbWVudFxuICAgICAgICAgICAgICAgICAgICAvLyBhcyB5b3UgY2FuIG5vdCBkaXNwYXRjaCBhbiBldmVudCB0d2ljZSwgY3JlYXRlIGEgbmV3IG9uZS5cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudChcImNoYW5nZVwiKSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KHRoaXMuX2RlYm91bmRlcik7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlLmtleSA9PT0gXCJFbnRlclwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZGVib3VuZGVyID0gd2luZG93LnNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy4kZXZlbnQgPSBlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KFwiY2hhbmdlXCIpKVxuICAgICAgICAgICAgICAgICAgICB9LCB0aGlzLnBhcmFtcy5kZWJvdW5jZSlcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG5cblxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgZm9ybSBkYXRhIGFzIG9iamVjdCB3aXRoIGtleS12YWx1ZSBwYWlyXG4gICAgICpcbiAgICAgKiBgYGBcbiAgICAgKiBFeGFtcGxlOlxuICAgICAqXG4gICAgICogbGV0IGRhdGEgPSBrYV9mb3JtKFwiZm9ybUlkXCIpLmRhdGE7XG4gICAgICogZm9yIChsZXQga2V5IGluIGRhdGEpXG4gICAgICogICAgICBjb25zb2xlLmxvZyAoYGRhdGFbJHtuYW1lfV09JHtkYXRhW25hbWVdfWApO1xuICAgICAqIGBgYFxuICAgICAqXG4gICAgICogQHJldHVybiB7b2JqZWN0fVxuICAgICAqL1xuICAgIGdldCAkZGF0YSgpIHtcbiAgICAgICAgbGV0IGRhdGEgPSB7fTtcblxuICAgICAgICBsZXQgZ2V0VmFsID0gKGVsKSA9PiB7XG4gICAgICAgICAgICBzd2l0Y2ggKGVsLnRhZ05hbWUpIHtcbiAgICAgICAgICAgICAgICBjYXNlIFwiSU5QVVRcIjpcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChlbC50eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiY2hlY2tib3hcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJyYWRpb1wiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbC5jaGVja2VkID09IHRydWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBlbC52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhc2UgXCJTRUxFQ1RcIjpcbiAgICAgICAgICAgICAgICBjYXNlIFwiVEVYVEFSRUFcIjpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVsLnZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGZvciAobGV0IGVsIG9mIHRoaXMuX2Zvcm1FbHMpIHtcbiAgICAgICAgICAgIGlmIChlbC5uYW1lID09PSBcIlwiKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgaWYgKGVsLm5hbWUuZW5kc1dpdGgoXCJbXVwiKSkge1xuICAgICAgICAgICAgICAgIC8vIFByb2Nlc3MgQXJyYXkgaW5wdXRcbiAgICAgICAgICAgICAgICBsZXQgbmFtZSA9IGVsLm5hbWUuc2xpY2UoMCwgLTIpO1xuICAgICAgICAgICAgICAgIGlmICggISBBcnJheS5pc0FycmF5KGRhdGFbbmFtZV0pKVxuICAgICAgICAgICAgICAgICAgICBkYXRhW25hbWVdID0gW107XG4gICAgICAgICAgICAgICAgZGF0YVtuYW1lXS5wdXNoKGdldFZhbChlbCkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBkYXRhW2VsLm5hbWVdID0gZ2V0VmFsKGVsKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNldCB0aGUgZGF0YSBmb3JtIGZvcm0gYXMgb2JqZWN0XG4gICAgICpcbiAgICAgKiBgYGBcbiAgICAgKiBrYV9mb3JtKFwiZm9ybUlkXCIpLiRkYXRhID0ge1xuICAgICAqICAgICBcIm5hbWUxXCI6IFwidmFsMVwiXG4gICAgICogfVxuICAgICAqIGBgYFxuICAgICAqXG4gICAgICogQHBhcmFtIHtvYmplY3R9IG5ld0RhdGFcbiAgICAgKi9cbiAgICBzZXQgJGRhdGEgKG5ld0RhdGEpIHtcbiAgICAgICAgLy8gU2tpcCBzZW5kaW5nIG9uY2hhbmdlIGV2ZW50IG9uICRkYXRhIHVwZGF0ZVxuICAgICAgICB0aGlzLl9za2lwU2VuZENoYW5nZUV2dCA9IHRydWU7XG5cbiAgICAgICAgbGV0IGNkYXRhLCBuYW1lID0gbnVsbDtcbiAgICAgICAgbGV0IGFyckluZGV4ID0ge307XG5cbiAgICAgICAgdGhpcy5fZGF0YSA9IG5ld0RhdGE7XG4gICAgICAgIGZvciAobGV0IGVsIG9mIHRoaXMuX2Zvcm1FbHMpIHtcbiAgICAgICAgICAgIG5hbWUgPSBlbC5uYW1lO1xuXG4gICAgICAgICAgICBpZiAobmFtZS5lbmRzV2l0aChcIltdXCIpKSB7XG4gICAgICAgICAgICAgICAgbmFtZSA9IG5hbWUuc2xpY2UoMCwgLTIpO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgYXJySW5kZXhbbmFtZV0gPT09IFwidW5kZWZpbmVkXCIpXG4gICAgICAgICAgICAgICAgICAgIGFyckluZGV4W25hbWVdID0gMDtcbiAgICAgICAgICAgICAgICBjZGF0YSA9IG5ld0RhdGFbbmFtZV07XG4gICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoY2RhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNkYXRhID0gY2RhdGFbYXJySW5kZXhbbmFtZV0rK107XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY2RhdGEgPSBcIlwiO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbGV0IG5hbWUgPSBlbC5uYW1lO1xuICAgICAgICAgICAgICAgIGxldCBjZGF0YSA9IG5ld0RhdGFbbmFtZV07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgY2RhdGEgPT09IFwidW5kZWZpbmVkXCIpXG4gICAgICAgICAgICAgICAgY2RhdGEgPSBcIlwiO1xuICAgICAgICAgICAgaWYgKGVsLnRhZ05hbWUgPT09IFwiSU5QVVRcIiAmJiBlbC50eXBlID09PSBcImNoZWNrYm94XCIgfHwgZWwudHlwZSA9PT0gXCJyYWRpb1wiKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNkYXRhID09PSBlbC52YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBlbC5jaGVja2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBlbC5jaGVja2VkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBlbC52YWx1ZSA9IGNkYXRhO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3NraXBTZW5kQ2hhbmdlRXZ0ID0gZmFsc2U7XG4gICAgfVxuXG4gICAgZGlzY29ubmVjdGVkQ2FsbGJhY2soKSB7XG4gICAgICAgIHRoaXMuX29ic2VydmVyLmRpc2Nvbm5lY3QoKTtcbiAgICB9XG5cbiAgICBjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICAgICAgdGhpcy5fb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcigoZSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5fdXBkYXRlRWxDb24oKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuX29ic2VydmVyLm9ic2VydmUodGhpcywge2NoaWxkTGlzdDogdHJ1ZSwgc3VidHJlZTogdHJ1ZX0pO1xuICAgICAgICB0aGlzLl91cGRhdGVFbENvbigpO1xuICAgICAgICBpZiAodGhpcy5oYXNBdHRyaWJ1dGUoXCJpbml0XCIpKSB7XG4gICAgICAgICAgICBsZXQgY29kZSA9IHRoaXMuZ2V0QXR0cmlidXRlKFwiaW5pdFwiKVxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBldmFsKGNvZGUpO1xuICAgICAgICAgICAgfSBjYXRjaCAgKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGUsIHRoaXMpO1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgZXZhbChcIiR7Y29kZX1cIikgZmFpbGVkOiAke2V9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZShcImthLWZvcm1cIiwgS2FzaW1pckZvcm0sIHtleHRlbmRzOiBcImZvcm1cIn0pOyIsIlxuY2xhc3MgS2FzaW1pclNlbGVjdCBleHRlbmRzIEhUTUxTZWxlY3RFbGVtZW50IHtcblxuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMuX18kb3B0aW9ucyA9IFtdO1xuICAgIH1cblxuXG4gICAgX3VwZGF0ZU9wdGlvbnMoKSB7XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJ1cGRhdGVPcHRpb25zKClcIik7XG4gICAgICAgIGxldCB2YWxfa2V5ID0gXCJ2YWx1ZVwiO1xuICAgICAgICBsZXQgdGV4dF9rZXkgPSBcInRleHRcIjtcbiAgICAgICAgaWYgKHRoaXMuaGFzQXR0cmlidXRlKFwidmFsdWVfa2V5XCIpKVxuICAgICAgICAgICAgdmFsX2tleSA9IHRoaXMuZ2V0QXR0cmlidXRlKFwidmFsdWVfa2V5XCIpO1xuICAgICAgICBpZiAodGhpcy5oYXNBdHRyaWJ1dGUoXCJ0ZXh0X2tleVwiKSlcbiAgICAgICAgICAgIHRleHRfa2V5ID0gdGhpcy5nZXRBdHRyaWJ1dGUoXCJ0ZXh0X2tleVwiKTtcblxuICAgICAgICB0aGlzLmlubmVySFRNTCA9IFwiXCI7XG4gICAgICAgIGZvcihsZXQgb3B0aW9uIG9mIHRoaXMuX18kb3B0aW9ucykge1xuICAgICAgICAgICAgbGV0IG9wdEVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcIm9wdGlvblwiKTtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9uID09PSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgICAgICAgb3B0RWwudmFsdWUgPSBvcHRpb25bdmFsX2tleV07XG4gICAgICAgICAgICAgICAgb3B0RWwuaW5uZXJUZXh0ID0gb3B0aW9uW3RleHRfa2V5XTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgb3B0RWwudmFsdWUgPSBvcHRpb247XG4gICAgICAgICAgICAgICAgb3B0RWwuaW5uZXJUZXh0ID0gb3B0aW9uO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5hcHBlbmRDaGlsZChvcHRFbCk7XG4gICAgICAgIH1cbiAgICB9XG5cblxuICAgIGNvbm5lY3RlZENhbGxiYWNrKCkge1xuICAgICAgICBsZXQgaW5pT3B0aW9ucyA9IHRoaXMuJG9wdGlvbnM7XG4gICAgICAgIGxldCB2YWx1ZSA9IHRoaXMuJHZhbHVlO1xuXG4gICAgICAgIC8vIEdldHRlcnMgLyBTZXR0ZXJzIG5vdCBwb3NzaWJsZSBpZiBwcm9wZXJ0eSBhbHJlYWR5IGRlZmluZWQuXG4gICAgICAgIC8vIFRoaXMgaGFwcGVucyBpZiBlbGVtZW50IGlzIGxvYWRlZCBiZWZvcmUganNcbiAgICAgICAgLy8gVGhlcmVmb3I6IGFwcGx5IG9ubHkgb24gY29ubmVjdCBhbmQga2VlcCB0aGUgcHJvcGVydHkgdmFsdWVcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICckb3B0aW9ucycsIHtcbiAgICAgICAgICAgIHNldDogKHZhbCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuX18kb3B0aW9ucyA9IHZhbDtcbiAgICAgICAgICAgICAgICB0aGlzLl91cGRhdGVPcHRpb25zKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0OiAodmFsKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX18kb3B0aW9uc1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICckdmFsdWUnLCB7XG4gICAgICAgICAgICBzZXQ6ICh2YWwpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnZhbHVlID0gdmFsO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldDogKHZhbCkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKHR5cGVvZiBpbmlPcHRpb25zICE9PSBcInVuZGVmaW5lZFwiKVxuICAgICAgICAgICAgdGhpcy4kb3B0aW9ucyA9IGluaU9wdGlvbnM7XG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgIT09IFwidW5kZWZpbmVkXCIpXG4gICAgICAgICAgICB0aGlzLiR2YWx1ZSA9IHZhbHVlO1xuXG4gICAgICAgIGlmICh0aGlzLmhhc0F0dHJpYnV0ZShcImluaXRcIikpIHtcbiAgICAgICAgICAgIGxldCBjb2RlID0gdGhpcy5nZXRBdHRyaWJ1dGUoXCJpbml0XCIpXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGV2YWwoY29kZSk7XG4gICAgICAgICAgICB9IGNhdGNoICAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSwgdGhpcyk7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBldmFsKFwiJHtjb2RlfVwiKSBmYWlsZWQ6ICR7ZX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZShcImthLXNlbGVjdFwiLCBLYXNpbWlyU2VsZWN0LCB7ZXh0ZW5kczogXCJzZWxlY3RcIn0pOyJdfQ==