/**
 * Infracamp's Kasimir Templates
 *
 * A no-dependency render on request
 *
 * @author Matthias Leuffen <m@tth.es>
 */

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


    /**
     * Scan the form content tree for form elements and register callbacks
     *
     *
     * @private
     */
    _updateElCon() {
        this._formEls = [];
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
     * let data = ka_form("formId").$data;
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
            if (el.name === "" && el.id === "")
                continue;

            let name = el.name;
            if (name === "")
                name = el.id;

            if (name.endsWith("[]")) {
                // Process Array input
                name = el.name.slice(0, -2);
                if ( ! Array.isArray(data[name]))
                    data[name] = [];
                data[name].push(getVal(el));
                continue;

            }
            data[name] = getVal(el);
        }
        this._data = data;
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
            if (el.name === "" && el.id === "")
                continue;

            name = el.name;
            if (name === "")
                name = el.id;

            let cdata = "";

            if (name.endsWith("[]")) {
                name = name.slice(0, -2);
                if (typeof arrIndex[name] === "undefined")
                    arrIndex[name] = 0;
                cdata = newData[name];
                if (Array.isArray(cdata)) {
                    cdata = cdata[arrIndex[name]++];
                }
            } else {
                cdata = newData[name];
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
            let code = this.getAttribute("init");
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZ1bmN0aW9uLmpzIiwia2FzaW1pci1mb3JtLmpzIiwia2FzaW1pci1zZWxlY3QuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQy9NQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoia2FzaW1pci1mb3JtLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG4vKipcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqIEByZXR1cm4ge0thc2ltaXJGb3JtfVxuICovXG5mdW5jdGlvbiBrYV9mb3JtKHNlbGVjdG9yKSB7XG4gICAgaWYgKHNlbGVjdG9yIGluc3RhbmNlb2YgS2FzaW1pckZvcm0pXG4gICAgICAgIHJldHVybiBzZWxlY3RvcjtcbiAgICBsZXQgZWxlbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHNlbGVjdG9yKTtcbiAgICBpZiAoZWxlbSA9PT0gbnVsbClcbiAgICAgICAgdGhyb3cgYFNlbGVjdG9yICcke3NlbGVjdG9yfScgbm90IGZvdW5kIChubyBlbGVtZW50IG1pdCBpZClgO1xuICAgIGlmIChlbGVtIGluc3RhbmNlb2YgS2FzaW1pckZvcm0pIHtcbiAgICAgICAgcmV0dXJuIGVsZW07XG4gICAgfVxuICAgIHRocm93IGBTZWxlY3RvciAnJHtzZWxlY3Rvcn0nIGlzIG5vdCBhIDxmb3JtIGlzPVwia2EtZm9ybVwiPiBlbGVtZW50YDtcbn0iLCJcblxuXG5cbmNsYXNzIEthc2ltaXJGb3JtIGV4dGVuZHMgSFRNTEZvcm1FbGVtZW50IHtcblxuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMuX2RhdGEgPSB7fTtcbiAgICAgICAgdGhpcy5wYXJhbXMgPSB7XG4gICAgICAgICAgICBcImRlYm91bmNlXCI6IDIwMFxuICAgICAgICB9O1xuICAgICAgICB0aGlzLl9kZWJvdW5kZXIgPSBudWxsO1xuICAgICAgICB0aGlzLl9mb3JtRWxzID0gW107XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRoZSBsYXN0IGV2ZW50IHRoYXQgd2FzIHRyaWdnZXJlZFxuICAgICAgICAgKiBAdHlwZSB7RXZlbnR8bnVsbH1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuJGV2ZW50ID0gbnVsbDtcblxuICAgICAgICB0aGlzLl9za2lwU2VuZENoYW5nZUV2dCA9IGZhbHNlO1xuXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKFwic3VibWl0XCIsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9KTtcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqIFNjYW4gdGhlIGZvcm0gY29udGVudCB0cmVlIGZvciBmb3JtIGVsZW1lbnRzIGFuZCByZWdpc3RlciBjYWxsYmFja3NcbiAgICAgKlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfdXBkYXRlRWxDb24oKSB7XG4gICAgICAgIHRoaXMuX2Zvcm1FbHMgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgZWwgb2YgdGhpcy5xdWVyeVNlbGVjdG9yQWxsKFwiaW5wdXQsc2VsZWN0LHRleHRhcmVhXCIpKSB7XG4gICAgICAgICAgICB0aGlzLl9mb3JtRWxzLnB1c2goZWwpO1xuICAgICAgICAgICAgaWYgKGVsLl9rYXNpRm9ybUkgPT09IHRydWUpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICBlbC5fa2FzaUZvcm1JID0gdHJ1ZTtcbiAgICAgICAgICAgIGlmIChlbCBpbnN0YW5jZW9mIEhUTUxTZWxlY3RFbGVtZW50IHx8IChlbCBpbnN0YW5jZW9mIEhUTUxJbnB1dEVsZW1lbnQgJiYgZWwudHlwZSA9PT0gXCJjaGVja2JveFwiKSApIHtcbiAgICAgICAgICAgICAgICBlbC5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLl9za2lwU2VuZENoYW5nZUV2dClcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAgICAgICAgICAgICB0aGlzLiRldmVudCA9IGU7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gZGlzcGF0Y2ggdGhlIG9yaWdpbmFsIGV2ZW50IGluIGZvcm0gZWxlbWVudFxuICAgICAgICAgICAgICAgICAgICAvLyBhcyB5b3UgY2FuIG5vdCBkaXNwYXRjaCBhbiBldmVudCB0d2ljZSwgY3JlYXRlIGEgbmV3IG9uZS5cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudChcImNoYW5nZVwiKSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KHRoaXMuX2RlYm91bmRlcik7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlLmtleSA9PT0gXCJFbnRlclwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZGVib3VuZGVyID0gd2luZG93LnNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy4kZXZlbnQgPSBlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KFwiY2hhbmdlXCIpKVxuICAgICAgICAgICAgICAgICAgICB9LCB0aGlzLnBhcmFtcy5kZWJvdW5jZSlcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG5cblxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgZm9ybSBkYXRhIGFzIG9iamVjdCB3aXRoIGtleS12YWx1ZSBwYWlyXG4gICAgICpcbiAgICAgKiBgYGBcbiAgICAgKiBFeGFtcGxlOlxuICAgICAqXG4gICAgICogbGV0IGRhdGEgPSBrYV9mb3JtKFwiZm9ybUlkXCIpLiRkYXRhO1xuICAgICAqIGZvciAobGV0IGtleSBpbiBkYXRhKVxuICAgICAqICAgICAgY29uc29sZS5sb2cgKGBkYXRhWyR7bmFtZX1dPSR7ZGF0YVtuYW1lXX1gKTtcbiAgICAgKiBgYGBcbiAgICAgKlxuICAgICAqIEByZXR1cm4ge29iamVjdH1cbiAgICAgKi9cbiAgICBnZXQgJGRhdGEoKSB7XG4gICAgICAgIGxldCBkYXRhID0ge307XG5cbiAgICAgICAgbGV0IGdldFZhbCA9IChlbCkgPT4ge1xuICAgICAgICAgICAgc3dpdGNoIChlbC50YWdOYW1lKSB7XG4gICAgICAgICAgICAgICAgY2FzZSBcIklOUFVUXCI6XG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoZWwudHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcImNoZWNrYm94XCI6XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwicmFkaW9cIjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZWwuY2hlY2tlZCA9PSB0cnVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZWwudmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXNlIFwiU0VMRUNUXCI6XG4gICAgICAgICAgICAgICAgY2FzZSBcIlRFWFRBUkVBXCI6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBlbC52YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBmb3IgKGxldCBlbCBvZiB0aGlzLl9mb3JtRWxzKSB7XG4gICAgICAgICAgICBpZiAoZWwubmFtZSA9PT0gXCJcIiAmJiBlbC5pZCA9PT0gXCJcIilcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICAgICAgbGV0IG5hbWUgPSBlbC5uYW1lO1xuICAgICAgICAgICAgaWYgKG5hbWUgPT09IFwiXCIpXG4gICAgICAgICAgICAgICAgbmFtZSA9IGVsLmlkO1xuXG4gICAgICAgICAgICBpZiAobmFtZS5lbmRzV2l0aChcIltdXCIpKSB7XG4gICAgICAgICAgICAgICAgLy8gUHJvY2VzcyBBcnJheSBpbnB1dFxuICAgICAgICAgICAgICAgIG5hbWUgPSBlbC5uYW1lLnNsaWNlKDAsIC0yKTtcbiAgICAgICAgICAgICAgICBpZiAoICEgQXJyYXkuaXNBcnJheShkYXRhW25hbWVdKSlcbiAgICAgICAgICAgICAgICAgICAgZGF0YVtuYW1lXSA9IFtdO1xuICAgICAgICAgICAgICAgIGRhdGFbbmFtZV0ucHVzaChnZXRWYWwoZWwpKTtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGF0YVtuYW1lXSA9IGdldFZhbChlbCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fZGF0YSA9IGRhdGE7XG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNldCB0aGUgZGF0YSBmb3JtIGZvcm0gYXMgb2JqZWN0XG4gICAgICpcbiAgICAgKiBgYGBcbiAgICAgKiBrYV9mb3JtKFwiZm9ybUlkXCIpLiRkYXRhID0ge1xuICAgICAqICAgICBcIm5hbWUxXCI6IFwidmFsMVwiXG4gICAgICogfVxuICAgICAqIGBgYFxuICAgICAqXG4gICAgICogQHBhcmFtIHtvYmplY3R9IG5ld0RhdGFcbiAgICAgKi9cbiAgICBzZXQgJGRhdGEgKG5ld0RhdGEpIHtcbiAgICAgICAgLy8gU2tpcCBzZW5kaW5nIG9uY2hhbmdlIGV2ZW50IG9uICRkYXRhIHVwZGF0ZVxuICAgICAgICB0aGlzLl9za2lwU2VuZENoYW5nZUV2dCA9IHRydWU7XG5cbiAgICAgICAgbGV0IGNkYXRhLCBuYW1lID0gbnVsbDtcbiAgICAgICAgbGV0IGFyckluZGV4ID0ge307XG5cbiAgICAgICAgdGhpcy5fZGF0YSA9IG5ld0RhdGE7XG4gICAgICAgIGZvciAobGV0IGVsIG9mIHRoaXMuX2Zvcm1FbHMpIHtcbiAgICAgICAgICAgIGlmIChlbC5uYW1lID09PSBcIlwiICYmIGVsLmlkID09PSBcIlwiKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICBuYW1lID0gZWwubmFtZTtcbiAgICAgICAgICAgIGlmIChuYW1lID09PSBcIlwiKVxuICAgICAgICAgICAgICAgIG5hbWUgPSBlbC5pZDtcblxuICAgICAgICAgICAgbGV0IGNkYXRhID0gXCJcIjtcblxuICAgICAgICAgICAgaWYgKG5hbWUuZW5kc1dpdGgoXCJbXVwiKSkge1xuICAgICAgICAgICAgICAgIG5hbWUgPSBuYW1lLnNsaWNlKDAsIC0yKTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGFyckluZGV4W25hbWVdID09PSBcInVuZGVmaW5lZFwiKVxuICAgICAgICAgICAgICAgICAgICBhcnJJbmRleFtuYW1lXSA9IDA7XG4gICAgICAgICAgICAgICAgY2RhdGEgPSBuZXdEYXRhW25hbWVdO1xuICAgICAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KGNkYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICBjZGF0YSA9IGNkYXRhW2FyckluZGV4W25hbWVdKytdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY2RhdGEgPSBuZXdEYXRhW25hbWVdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodHlwZW9mIGNkYXRhID09PSBcInVuZGVmaW5lZFwiKVxuICAgICAgICAgICAgICAgIGNkYXRhID0gXCJcIjtcbiAgICAgICAgICAgIGlmIChlbC50YWdOYW1lID09PSBcIklOUFVUXCIgJiYgZWwudHlwZSA9PT0gXCJjaGVja2JveFwiIHx8IGVsLnR5cGUgPT09IFwicmFkaW9cIikge1xuICAgICAgICAgICAgICAgIGlmIChjZGF0YSA9PT0gZWwudmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwuY2hlY2tlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZWwuY2hlY2tlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZWwudmFsdWUgPSBjZGF0YTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9za2lwU2VuZENoYW5nZUV2dCA9IGZhbHNlO1xuICAgIH1cblxuICAgIGRpc2Nvbm5lY3RlZENhbGxiYWNrKCkge1xuICAgICAgICB0aGlzLl9vYnNlcnZlci5kaXNjb25uZWN0KCk7XG4gICAgfVxuXG4gICAgY29ubmVjdGVkQ2FsbGJhY2soKSB7XG4gICAgICAgIHRoaXMuX29ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoKGUpID0+IHtcbiAgICAgICAgICAgIHRoaXMuX3VwZGF0ZUVsQ29uKCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLl9vYnNlcnZlci5vYnNlcnZlKHRoaXMsIHtjaGlsZExpc3Q6IHRydWUsIHN1YnRyZWU6IHRydWV9KTtcbiAgICAgICAgdGhpcy5fdXBkYXRlRWxDb24oKTtcbiAgICAgICAgaWYgKHRoaXMuaGFzQXR0cmlidXRlKFwiaW5pdFwiKSkge1xuICAgICAgICAgICAgbGV0IGNvZGUgPSB0aGlzLmdldEF0dHJpYnV0ZShcImluaXRcIik7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGV2YWwoY29kZSk7XG4gICAgICAgICAgICB9IGNhdGNoICAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSwgdGhpcyk7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBldmFsKFwiJHtjb2RlfVwiKSBmYWlsZWQ6ICR7ZX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKFwia2EtZm9ybVwiLCBLYXNpbWlyRm9ybSwge2V4dGVuZHM6IFwiZm9ybVwifSk7IiwiXG5jbGFzcyBLYXNpbWlyU2VsZWN0IGV4dGVuZHMgSFRNTFNlbGVjdEVsZW1lbnQge1xuXG5cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5fXyRvcHRpb25zID0gW107XG4gICAgfVxuXG5cbiAgICBfdXBkYXRlT3B0aW9ucygpIHtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcInVwZGF0ZU9wdGlvbnMoKVwiKTtcbiAgICAgICAgbGV0IHZhbF9rZXkgPSBcInZhbHVlXCI7XG4gICAgICAgIGxldCB0ZXh0X2tleSA9IFwidGV4dFwiO1xuICAgICAgICBpZiAodGhpcy5oYXNBdHRyaWJ1dGUoXCJ2YWx1ZV9rZXlcIikpXG4gICAgICAgICAgICB2YWxfa2V5ID0gdGhpcy5nZXRBdHRyaWJ1dGUoXCJ2YWx1ZV9rZXlcIik7XG4gICAgICAgIGlmICh0aGlzLmhhc0F0dHJpYnV0ZShcInRleHRfa2V5XCIpKVxuICAgICAgICAgICAgdGV4dF9rZXkgPSB0aGlzLmdldEF0dHJpYnV0ZShcInRleHRfa2V5XCIpO1xuXG4gICAgICAgIHRoaXMuaW5uZXJIVE1MID0gXCJcIjtcbiAgICAgICAgZm9yKGxldCBvcHRpb24gb2YgdGhpcy5fXyRvcHRpb25zKSB7XG4gICAgICAgICAgICBsZXQgb3B0RWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwib3B0aW9uXCIpO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb24gPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICAgICAgICBvcHRFbC52YWx1ZSA9IG9wdGlvblt2YWxfa2V5XTtcbiAgICAgICAgICAgICAgICBvcHRFbC5pbm5lclRleHQgPSBvcHRpb25bdGV4dF9rZXldO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBvcHRFbC52YWx1ZSA9IG9wdGlvbjtcbiAgICAgICAgICAgICAgICBvcHRFbC5pbm5lclRleHQgPSBvcHRpb247XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmFwcGVuZENoaWxkKG9wdEVsKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG4gICAgY29ubmVjdGVkQ2FsbGJhY2soKSB7XG4gICAgICAgIGxldCBpbmlPcHRpb25zID0gdGhpcy4kb3B0aW9ucztcbiAgICAgICAgbGV0IHZhbHVlID0gdGhpcy4kdmFsdWU7XG5cbiAgICAgICAgLy8gR2V0dGVycyAvIFNldHRlcnMgbm90IHBvc3NpYmxlIGlmIHByb3BlcnR5IGFscmVhZHkgZGVmaW5lZC5cbiAgICAgICAgLy8gVGhpcyBoYXBwZW5zIGlmIGVsZW1lbnQgaXMgbG9hZGVkIGJlZm9yZSBqc1xuICAgICAgICAvLyBUaGVyZWZvcjogYXBwbHkgb25seSBvbiBjb25uZWN0IGFuZCBrZWVwIHRoZSBwcm9wZXJ0eSB2YWx1ZVxuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJyRvcHRpb25zJywge1xuICAgICAgICAgICAgc2V0OiAodmFsKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fXyRvcHRpb25zID0gdmFsO1xuICAgICAgICAgICAgICAgIHRoaXMuX3VwZGF0ZU9wdGlvbnMoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXQ6ICh2YWwpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fXyRvcHRpb25zXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJyR2YWx1ZScsIHtcbiAgICAgICAgICAgIHNldDogKHZhbCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMudmFsdWUgPSB2YWw7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0OiAodmFsKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMudmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAodHlwZW9mIGluaU9wdGlvbnMgIT09IFwidW5kZWZpbmVkXCIpXG4gICAgICAgICAgICB0aGlzLiRvcHRpb25zID0gaW5pT3B0aW9ucztcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJ1bmRlZmluZWRcIilcbiAgICAgICAgICAgIHRoaXMuJHZhbHVlID0gdmFsdWU7XG5cbiAgICAgICAgaWYgKHRoaXMuaGFzQXR0cmlidXRlKFwiaW5pdFwiKSkge1xuICAgICAgICAgICAgbGV0IGNvZGUgPSB0aGlzLmdldEF0dHJpYnV0ZShcImluaXRcIilcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgZXZhbChjb2RlKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlLCB0aGlzKTtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGV2YWwoXCIke2NvZGV9XCIpIGZhaWxlZDogJHtlfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG5cbn1cblxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKFwia2Etc2VsZWN0XCIsIEthc2ltaXJTZWxlY3QsIHtleHRlbmRzOiBcInNlbGVjdFwifSk7Il19
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZ1bmN0aW9uLmpzIiwia2FzaW1pci1mb3JtLmpzIiwia2FzaW1pci1zZWxlY3QuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQy9NQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoia2FzaW1pci1mb3JtLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG4vKipcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqIEByZXR1cm4ge0thc2ltaXJGb3JtfVxuICovXG5mdW5jdGlvbiBrYV9mb3JtKHNlbGVjdG9yKSB7XG4gICAgaWYgKHNlbGVjdG9yIGluc3RhbmNlb2YgS2FzaW1pckZvcm0pXG4gICAgICAgIHJldHVybiBzZWxlY3RvcjtcbiAgICBsZXQgZWxlbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHNlbGVjdG9yKTtcbiAgICBpZiAoZWxlbSA9PT0gbnVsbClcbiAgICAgICAgdGhyb3cgYFNlbGVjdG9yICcke3NlbGVjdG9yfScgbm90IGZvdW5kIChubyBlbGVtZW50IG1pdCBpZClgO1xuICAgIGlmIChlbGVtIGluc3RhbmNlb2YgS2FzaW1pckZvcm0pIHtcbiAgICAgICAgcmV0dXJuIGVsZW07XG4gICAgfVxuICAgIHRocm93IGBTZWxlY3RvciAnJHtzZWxlY3Rvcn0nIGlzIG5vdCBhIDxmb3JtIGlzPVwia2EtZm9ybVwiPiBlbGVtZW50YDtcbn0iLCJcblxuXG5cbmNsYXNzIEthc2ltaXJGb3JtIGV4dGVuZHMgSFRNTEZvcm1FbGVtZW50IHtcblxuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMuX2RhdGEgPSB7fTtcbiAgICAgICAgdGhpcy5wYXJhbXMgPSB7XG4gICAgICAgICAgICBcImRlYm91bmNlXCI6IDIwMFxuICAgICAgICB9O1xuICAgICAgICB0aGlzLl9kZWJvdW5kZXIgPSBudWxsO1xuICAgICAgICB0aGlzLl9mb3JtRWxzID0gW107XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRoZSBsYXN0IGV2ZW50IHRoYXQgd2FzIHRyaWdnZXJlZFxuICAgICAgICAgKiBAdHlwZSB7RXZlbnR8bnVsbH1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuJGV2ZW50ID0gbnVsbDtcblxuICAgICAgICB0aGlzLl9za2lwU2VuZENoYW5nZUV2dCA9IGZhbHNlO1xuXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKFwic3VibWl0XCIsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9KTtcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqIFNjYW4gdGhlIGZvcm0gY29udGVudCB0cmVlIGZvciBmb3JtIGVsZW1lbnRzIGFuZCByZWdpc3RlciBjYWxsYmFja3NcbiAgICAgKlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfdXBkYXRlRWxDb24oKSB7XG4gICAgICAgIHRoaXMuX2Zvcm1FbHMgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgZWwgb2YgdGhpcy5xdWVyeVNlbGVjdG9yQWxsKFwiaW5wdXQsc2VsZWN0LHRleHRhcmVhXCIpKSB7XG4gICAgICAgICAgICB0aGlzLl9mb3JtRWxzLnB1c2goZWwpO1xuICAgICAgICAgICAgaWYgKGVsLl9rYXNpRm9ybUkgPT09IHRydWUpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICBlbC5fa2FzaUZvcm1JID0gdHJ1ZTtcbiAgICAgICAgICAgIGlmIChlbCBpbnN0YW5jZW9mIEhUTUxTZWxlY3RFbGVtZW50IHx8IChlbCBpbnN0YW5jZW9mIEhUTUxJbnB1dEVsZW1lbnQgJiYgZWwudHlwZSA9PT0gXCJjaGVja2JveFwiKSApIHtcbiAgICAgICAgICAgICAgICBlbC5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLl9za2lwU2VuZENoYW5nZUV2dClcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAgICAgICAgICAgICB0aGlzLiRldmVudCA9IGU7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gZGlzcGF0Y2ggdGhlIG9yaWdpbmFsIGV2ZW50IGluIGZvcm0gZWxlbWVudFxuICAgICAgICAgICAgICAgICAgICAvLyBhcyB5b3UgY2FuIG5vdCBkaXNwYXRjaCBhbiBldmVudCB0d2ljZSwgY3JlYXRlIGEgbmV3IG9uZS5cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudChcImNoYW5nZVwiKSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KHRoaXMuX2RlYm91bmRlcik7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlLmtleSA9PT0gXCJFbnRlclwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZGVib3VuZGVyID0gd2luZG93LnNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy4kZXZlbnQgPSBlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KFwiY2hhbmdlXCIpKVxuICAgICAgICAgICAgICAgICAgICB9LCB0aGlzLnBhcmFtcy5kZWJvdW5jZSlcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG5cblxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgZm9ybSBkYXRhIGFzIG9iamVjdCB3aXRoIGtleS12YWx1ZSBwYWlyXG4gICAgICpcbiAgICAgKiBgYGBcbiAgICAgKiBFeGFtcGxlOlxuICAgICAqXG4gICAgICogbGV0IGRhdGEgPSBrYV9mb3JtKFwiZm9ybUlkXCIpLiRkYXRhO1xuICAgICAqIGZvciAobGV0IGtleSBpbiBkYXRhKVxuICAgICAqICAgICAgY29uc29sZS5sb2cgKGBkYXRhWyR7bmFtZX1dPSR7ZGF0YVtuYW1lXX1gKTtcbiAgICAgKiBgYGBcbiAgICAgKlxuICAgICAqIEByZXR1cm4ge29iamVjdH1cbiAgICAgKi9cbiAgICBnZXQgJGRhdGEoKSB7XG4gICAgICAgIGxldCBkYXRhID0ge307XG5cbiAgICAgICAgbGV0IGdldFZhbCA9IChlbCkgPT4ge1xuICAgICAgICAgICAgc3dpdGNoIChlbC50YWdOYW1lKSB7XG4gICAgICAgICAgICAgICAgY2FzZSBcIklOUFVUXCI6XG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoZWwudHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcImNoZWNrYm94XCI6XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwicmFkaW9cIjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZWwuY2hlY2tlZCA9PSB0cnVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZWwudmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXNlIFwiU0VMRUNUXCI6XG4gICAgICAgICAgICAgICAgY2FzZSBcIlRFWFRBUkVBXCI6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBlbC52YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBmb3IgKGxldCBlbCBvZiB0aGlzLl9mb3JtRWxzKSB7XG4gICAgICAgICAgICBpZiAoZWwubmFtZSA9PT0gXCJcIiAmJiBlbC5pZCA9PT0gXCJcIilcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICAgICAgbGV0IG5hbWUgPSBlbC5uYW1lO1xuICAgICAgICAgICAgaWYgKG5hbWUgPT09IFwiXCIpXG4gICAgICAgICAgICAgICAgbmFtZSA9IGVsLmlkO1xuXG4gICAgICAgICAgICBpZiAobmFtZS5lbmRzV2l0aChcIltdXCIpKSB7XG4gICAgICAgICAgICAgICAgLy8gUHJvY2VzcyBBcnJheSBpbnB1dFxuICAgICAgICAgICAgICAgIG5hbWUgPSBlbC5uYW1lLnNsaWNlKDAsIC0yKTtcbiAgICAgICAgICAgICAgICBpZiAoICEgQXJyYXkuaXNBcnJheShkYXRhW25hbWVdKSlcbiAgICAgICAgICAgICAgICAgICAgZGF0YVtuYW1lXSA9IFtdO1xuICAgICAgICAgICAgICAgIGRhdGFbbmFtZV0ucHVzaChnZXRWYWwoZWwpKTtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGF0YVtuYW1lXSA9IGdldFZhbChlbCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fZGF0YSA9IGRhdGE7XG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNldCB0aGUgZGF0YSBmb3JtIGZvcm0gYXMgb2JqZWN0XG4gICAgICpcbiAgICAgKiBgYGBcbiAgICAgKiBrYV9mb3JtKFwiZm9ybUlkXCIpLiRkYXRhID0ge1xuICAgICAqICAgICBcIm5hbWUxXCI6IFwidmFsMVwiXG4gICAgICogfVxuICAgICAqIGBgYFxuICAgICAqXG4gICAgICogQHBhcmFtIHtvYmplY3R9IG5ld0RhdGFcbiAgICAgKi9cbiAgICBzZXQgJGRhdGEgKG5ld0RhdGEpIHtcbiAgICAgICAgLy8gU2tpcCBzZW5kaW5nIG9uY2hhbmdlIGV2ZW50IG9uICRkYXRhIHVwZGF0ZVxuICAgICAgICB0aGlzLl9za2lwU2VuZENoYW5nZUV2dCA9IHRydWU7XG5cbiAgICAgICAgbGV0IGNkYXRhLCBuYW1lID0gbnVsbDtcbiAgICAgICAgbGV0IGFyckluZGV4ID0ge307XG5cbiAgICAgICAgdGhpcy5fZGF0YSA9IG5ld0RhdGE7XG4gICAgICAgIGZvciAobGV0IGVsIG9mIHRoaXMuX2Zvcm1FbHMpIHtcbiAgICAgICAgICAgIGlmIChlbC5uYW1lID09PSBcIlwiICYmIGVsLmlkID09PSBcIlwiKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICBuYW1lID0gZWwubmFtZTtcbiAgICAgICAgICAgIGlmIChuYW1lID09PSBcIlwiKVxuICAgICAgICAgICAgICAgIG5hbWUgPSBlbC5pZDtcblxuICAgICAgICAgICAgbGV0IGNkYXRhID0gXCJcIjtcblxuICAgICAgICAgICAgaWYgKG5hbWUuZW5kc1dpdGgoXCJbXVwiKSkge1xuICAgICAgICAgICAgICAgIG5hbWUgPSBuYW1lLnNsaWNlKDAsIC0yKTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGFyckluZGV4W25hbWVdID09PSBcInVuZGVmaW5lZFwiKVxuICAgICAgICAgICAgICAgICAgICBhcnJJbmRleFtuYW1lXSA9IDA7XG4gICAgICAgICAgICAgICAgY2RhdGEgPSBuZXdEYXRhW25hbWVdO1xuICAgICAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KGNkYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICBjZGF0YSA9IGNkYXRhW2FyckluZGV4W25hbWVdKytdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY2RhdGEgPSBuZXdEYXRhW25hbWVdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodHlwZW9mIGNkYXRhID09PSBcInVuZGVmaW5lZFwiKVxuICAgICAgICAgICAgICAgIGNkYXRhID0gXCJcIjtcbiAgICAgICAgICAgIGlmIChlbC50YWdOYW1lID09PSBcIklOUFVUXCIgJiYgZWwudHlwZSA9PT0gXCJjaGVja2JveFwiIHx8IGVsLnR5cGUgPT09IFwicmFkaW9cIikge1xuICAgICAgICAgICAgICAgIGlmIChjZGF0YSA9PT0gZWwudmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwuY2hlY2tlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZWwuY2hlY2tlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZWwudmFsdWUgPSBjZGF0YTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9za2lwU2VuZENoYW5nZUV2dCA9IGZhbHNlO1xuICAgIH1cblxuICAgIGRpc2Nvbm5lY3RlZENhbGxiYWNrKCkge1xuICAgICAgICB0aGlzLl9vYnNlcnZlci5kaXNjb25uZWN0KCk7XG4gICAgfVxuXG4gICAgY29ubmVjdGVkQ2FsbGJhY2soKSB7XG4gICAgICAgIHRoaXMuX29ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoKGUpID0+IHtcbiAgICAgICAgICAgIHRoaXMuX3VwZGF0ZUVsQ29uKCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLl9vYnNlcnZlci5vYnNlcnZlKHRoaXMsIHtjaGlsZExpc3Q6IHRydWUsIHN1YnRyZWU6IHRydWV9KTtcbiAgICAgICAgdGhpcy5fdXBkYXRlRWxDb24oKTtcbiAgICAgICAgaWYgKHRoaXMuaGFzQXR0cmlidXRlKFwiaW5pdFwiKSkge1xuICAgICAgICAgICAgbGV0IGNvZGUgPSB0aGlzLmdldEF0dHJpYnV0ZShcImluaXRcIik7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGV2YWwoY29kZSk7XG4gICAgICAgICAgICB9IGNhdGNoICAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSwgdGhpcyk7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBldmFsKFwiJHtjb2RlfVwiKSBmYWlsZWQ6ICR7ZX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKFwia2EtZm9ybVwiLCBLYXNpbWlyRm9ybSwge2V4dGVuZHM6IFwiZm9ybVwifSk7IiwiXG5jbGFzcyBLYXNpbWlyU2VsZWN0IGV4dGVuZHMgSFRNTFNlbGVjdEVsZW1lbnQge1xuXG5cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5fXyRvcHRpb25zID0gW107XG4gICAgfVxuXG5cbiAgICBfdXBkYXRlT3B0aW9ucygpIHtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcInVwZGF0ZU9wdGlvbnMoKVwiKTtcbiAgICAgICAgbGV0IHZhbF9rZXkgPSBcInZhbHVlXCI7XG4gICAgICAgIGxldCB0ZXh0X2tleSA9IFwidGV4dFwiO1xuICAgICAgICBpZiAodGhpcy5oYXNBdHRyaWJ1dGUoXCJ2YWx1ZV9rZXlcIikpXG4gICAgICAgICAgICB2YWxfa2V5ID0gdGhpcy5nZXRBdHRyaWJ1dGUoXCJ2YWx1ZV9rZXlcIik7XG4gICAgICAgIGlmICh0aGlzLmhhc0F0dHJpYnV0ZShcInRleHRfa2V5XCIpKVxuICAgICAgICAgICAgdGV4dF9rZXkgPSB0aGlzLmdldEF0dHJpYnV0ZShcInRleHRfa2V5XCIpO1xuXG4gICAgICAgIHRoaXMuaW5uZXJIVE1MID0gXCJcIjtcbiAgICAgICAgZm9yKGxldCBvcHRpb24gb2YgdGhpcy5fXyRvcHRpb25zKSB7XG4gICAgICAgICAgICBsZXQgb3B0RWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwib3B0aW9uXCIpO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb24gPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICAgICAgICBvcHRFbC52YWx1ZSA9IG9wdGlvblt2YWxfa2V5XTtcbiAgICAgICAgICAgICAgICBvcHRFbC5pbm5lclRleHQgPSBvcHRpb25bdGV4dF9rZXldO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBvcHRFbC52YWx1ZSA9IG9wdGlvbjtcbiAgICAgICAgICAgICAgICBvcHRFbC5pbm5lclRleHQgPSBvcHRpb247XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmFwcGVuZENoaWxkKG9wdEVsKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG4gICAgY29ubmVjdGVkQ2FsbGJhY2soKSB7XG4gICAgICAgIGxldCBpbmlPcHRpb25zID0gdGhpcy4kb3B0aW9ucztcbiAgICAgICAgbGV0IHZhbHVlID0gdGhpcy4kdmFsdWU7XG5cbiAgICAgICAgLy8gR2V0dGVycyAvIFNldHRlcnMgbm90IHBvc3NpYmxlIGlmIHByb3BlcnR5IGFscmVhZHkgZGVmaW5lZC5cbiAgICAgICAgLy8gVGhpcyBoYXBwZW5zIGlmIGVsZW1lbnQgaXMgbG9hZGVkIGJlZm9yZSBqc1xuICAgICAgICAvLyBUaGVyZWZvcjogYXBwbHkgb25seSBvbiBjb25uZWN0IGFuZCBrZWVwIHRoZSBwcm9wZXJ0eSB2YWx1ZVxuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJyRvcHRpb25zJywge1xuICAgICAgICAgICAgc2V0OiAodmFsKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fXyRvcHRpb25zID0gdmFsO1xuICAgICAgICAgICAgICAgIHRoaXMuX3VwZGF0ZU9wdGlvbnMoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXQ6ICh2YWwpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fXyRvcHRpb25zXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJyR2YWx1ZScsIHtcbiAgICAgICAgICAgIHNldDogKHZhbCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMudmFsdWUgPSB2YWw7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0OiAodmFsKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMudmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAodHlwZW9mIGluaU9wdGlvbnMgIT09IFwidW5kZWZpbmVkXCIpXG4gICAgICAgICAgICB0aGlzLiRvcHRpb25zID0gaW5pT3B0aW9ucztcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJ1bmRlZmluZWRcIilcbiAgICAgICAgICAgIHRoaXMuJHZhbHVlID0gdmFsdWU7XG5cbiAgICAgICAgaWYgKHRoaXMuaGFzQXR0cmlidXRlKFwiaW5pdFwiKSkge1xuICAgICAgICAgICAgbGV0IGNvZGUgPSB0aGlzLmdldEF0dHJpYnV0ZShcImluaXRcIilcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgZXZhbChjb2RlKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlLCB0aGlzKTtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGV2YWwoXCIke2NvZGV9XCIpIGZhaWxlZDogJHtlfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG5cbn1cblxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKFwia2Etc2VsZWN0XCIsIEthc2ltaXJTZWxlY3QsIHtleHRlbmRzOiBcInNlbGVjdFwifSk7Il19