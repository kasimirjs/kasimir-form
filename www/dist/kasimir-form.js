
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZ1bmN0aW9uLmpzIiwia2FzaW1pci1mb3JtLmpzIiwia2FzaW1pci1zZWxlY3QuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoia2FzaW1pci1mb3JtLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG4vKipcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqIEByZXR1cm4ge0thc2ltaXJGb3JtfVxuICovXG5mdW5jdGlvbiBrYV9mb3JtKHNlbGVjdG9yKSB7XG4gICAgaWYgKHNlbGVjdG9yIGluc3RhbmNlb2YgS2FzaW1pckZvcm0pXG4gICAgICAgIHJldHVybiBzZWxlY3RvcjtcbiAgICBsZXQgZWxlbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHNlbGVjdG9yKTtcbiAgICBpZiAoZWxlbSA9PT0gbnVsbClcbiAgICAgICAgdGhyb3cgYFNlbGVjdG9yICcke3NlbGVjdG9yfScgbm90IGZvdW5kIChubyBlbGVtZW50IG1pdCBpZClgO1xuICAgIGlmIChlbGVtIGluc3RhbmNlb2YgS2FzaW1pckZvcm0pIHtcbiAgICAgICAgcmV0dXJuIGVsZW07XG4gICAgfVxuICAgIHRocm93IGBTZWxlY3RvciAnJHtzZWxlY3Rvcn0nIGlzIG5vdCBhIDxmb3JtIGlzPVwia2EtZm9ybVwiPiBlbGVtZW50YDtcbn0iLCJcblxuXG5cbmNsYXNzIEthc2ltaXJGb3JtIGV4dGVuZHMgSFRNTEZvcm1FbGVtZW50IHtcblxuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMuX2RhdGEgPSB7fTtcbiAgICAgICAgdGhpcy5wYXJhbXMgPSB7XG4gICAgICAgICAgICBcImRlYm91bmNlXCI6IDIwMFxuICAgICAgICB9O1xuICAgICAgICB0aGlzLl9kZWJvdW5kZXIgPSBudWxsO1xuICAgICAgICB0aGlzLl9mb3JtRWxzID0gW107XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRoZSBsYXN0IGV2ZW50IHRoYXQgd2FzIHRyaWdnZXJlZFxuICAgICAgICAgKiBAdHlwZSB7RXZlbnR8bnVsbH1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuJGV2ZW50ID0gbnVsbDtcblxuICAgICAgICB0aGlzLl9za2lwU2VuZENoYW5nZUV2dCA9IGZhbHNlO1xuXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKFwic3VibWl0XCIsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9KTtcbiAgICB9XG5cblxuICAgIF91cGRhdGVFbENvbigpIHtcbiAgICAgICAgZm9yIChsZXQgZWwgb2YgdGhpcy5xdWVyeVNlbGVjdG9yQWxsKFwiaW5wdXQsc2VsZWN0LHRleHRhcmVhXCIpKSB7XG5cbiAgICAgICAgICAgIHRoaXMuX2Zvcm1FbHMucHVzaChlbCk7XG4gICAgICAgICAgICBpZiAoZWwuX2thc2lGb3JtSSA9PT0gdHJ1ZSlcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIGVsLl9rYXNpRm9ybUkgPSB0cnVlO1xuICAgICAgICAgICAgaWYgKGVsIGluc3RhbmNlb2YgSFRNTFNlbGVjdEVsZW1lbnQgfHwgKGVsIGluc3RhbmNlb2YgSFRNTElucHV0RWxlbWVudCAmJiBlbC50eXBlID09PSBcImNoZWNrYm94XCIpICkge1xuICAgICAgICAgICAgICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgKGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuX3NraXBTZW5kQ2hhbmdlRXZ0KVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJGV2ZW50ID0gZTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBkaXNwYXRjaCB0aGUgb3JpZ2luYWwgZXZlbnQgaW4gZm9ybSBlbGVtZW50XG4gICAgICAgICAgICAgICAgICAgIC8vIGFzIHlvdSBjYW4gbm90IGRpc3BhdGNoIGFuIGV2ZW50IHR3aWNlLCBjcmVhdGUgYSBuZXcgb25lLlxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KFwiY2hhbmdlXCIpKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcihcImtleXVwXCIsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5jbGVhclRpbWVvdXQodGhpcy5fZGVib3VuZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGUua2V5ID09PSBcIkVudGVyXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9kZWJvdW5kZXIgPSB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLiRldmVudCA9IGU7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoXCJjaGFuZ2VcIikpXG4gICAgICAgICAgICAgICAgICAgIH0sIHRoaXMucGFyYW1zLmRlYm91bmNlKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cblxuXG4gICAgLyoqXG4gICAgICogR2V0IHRoZSBmb3JtIGRhdGEgYXMgb2JqZWN0IHdpdGgga2V5LXZhbHVlIHBhaXJcbiAgICAgKlxuICAgICAqIGBgYFxuICAgICAqIEV4YW1wbGU6XG4gICAgICpcbiAgICAgKiBsZXQgZGF0YSA9IGthX2Zvcm0oXCJmb3JtSWRcIikuJGRhdGE7XG4gICAgICogZm9yIChsZXQga2V5IGluIGRhdGEpXG4gICAgICogICAgICBjb25zb2xlLmxvZyAoYGRhdGFbJHtuYW1lfV09JHtkYXRhW25hbWVdfWApO1xuICAgICAqIGBgYFxuICAgICAqXG4gICAgICogQHJldHVybiB7b2JqZWN0fVxuICAgICAqL1xuICAgIGdldCAkZGF0YSgpIHtcbiAgICAgICAgbGV0IGRhdGEgPSB7fTtcblxuICAgICAgICBsZXQgZ2V0VmFsID0gKGVsKSA9PiB7XG4gICAgICAgICAgICBzd2l0Y2ggKGVsLnRhZ05hbWUpIHtcbiAgICAgICAgICAgICAgICBjYXNlIFwiSU5QVVRcIjpcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChlbC50eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiY2hlY2tib3hcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJyYWRpb1wiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbC5jaGVja2VkID09IHRydWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBlbC52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhc2UgXCJTRUxFQ1RcIjpcbiAgICAgICAgICAgICAgICBjYXNlIFwiVEVYVEFSRUFcIjpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVsLnZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGZvciAobGV0IGVsIG9mIHRoaXMuX2Zvcm1FbHMpIHtcbiAgICAgICAgICAgIGlmIChlbC5uYW1lID09PSBcIlwiICYmIGVsLmlkID09PSBcIlwiKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICBsZXQgbmFtZSA9IGVsLm5hbWU7XG4gICAgICAgICAgICBpZiAobmFtZSA9PT0gXCJcIilcbiAgICAgICAgICAgICAgICBuYW1lID0gZWwuaWQ7XG5cbiAgICAgICAgICAgIGlmIChuYW1lLmVuZHNXaXRoKFwiW11cIikpIHtcbiAgICAgICAgICAgICAgICAvLyBQcm9jZXNzIEFycmF5IGlucHV0XG4gICAgICAgICAgICAgICAgbmFtZSA9IGVsLm5hbWUuc2xpY2UoMCwgLTIpO1xuICAgICAgICAgICAgICAgIGlmICggISBBcnJheS5pc0FycmF5KGRhdGFbbmFtZV0pKVxuICAgICAgICAgICAgICAgICAgICBkYXRhW25hbWVdID0gW107XG4gICAgICAgICAgICAgICAgZGF0YVtuYW1lXS5wdXNoKGdldFZhbChlbCkpO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkYXRhW25hbWVdID0gZ2V0VmFsKGVsKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9kYXRhID0gZGF0YTtcbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2V0IHRoZSBkYXRhIGZvcm0gZm9ybSBhcyBvYmplY3RcbiAgICAgKlxuICAgICAqIGBgYFxuICAgICAqIGthX2Zvcm0oXCJmb3JtSWRcIikuJGRhdGEgPSB7XG4gICAgICogICAgIFwibmFtZTFcIjogXCJ2YWwxXCJcbiAgICAgKiB9XG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gbmV3RGF0YVxuICAgICAqL1xuICAgIHNldCAkZGF0YSAobmV3RGF0YSkge1xuICAgICAgICAvLyBTa2lwIHNlbmRpbmcgb25jaGFuZ2UgZXZlbnQgb24gJGRhdGEgdXBkYXRlXG4gICAgICAgIHRoaXMuX3NraXBTZW5kQ2hhbmdlRXZ0ID0gdHJ1ZTtcblxuICAgICAgICBsZXQgY2RhdGEsIG5hbWUgPSBudWxsO1xuICAgICAgICBsZXQgYXJySW5kZXggPSB7fTtcblxuICAgICAgICB0aGlzLl9kYXRhID0gbmV3RGF0YTtcbiAgICAgICAgZm9yIChsZXQgZWwgb2YgdGhpcy5fZm9ybUVscykge1xuICAgICAgICAgICAgaWYgKGVsLm5hbWUgPT09IFwiXCIgJiYgZWwuaWQgPT09IFwiXCIpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG5cbiAgICAgICAgICAgIG5hbWUgPSBlbC5uYW1lO1xuICAgICAgICAgICAgaWYgKG5hbWUgPT09IFwiXCIpXG4gICAgICAgICAgICAgICAgbmFtZSA9IGVsLmlkO1xuXG4gICAgICAgICAgICBsZXQgY2RhdGEgPSBcIlwiO1xuXG4gICAgICAgICAgICBpZiAobmFtZS5lbmRzV2l0aChcIltdXCIpKSB7XG4gICAgICAgICAgICAgICAgbmFtZSA9IG5hbWUuc2xpY2UoMCwgLTIpO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgYXJySW5kZXhbbmFtZV0gPT09IFwidW5kZWZpbmVkXCIpXG4gICAgICAgICAgICAgICAgICAgIGFyckluZGV4W25hbWVdID0gMDtcbiAgICAgICAgICAgICAgICBjZGF0YSA9IG5ld0RhdGFbbmFtZV07XG4gICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoY2RhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNkYXRhID0gY2RhdGFbYXJySW5kZXhbbmFtZV0rK107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjZGF0YSA9IG5ld0RhdGFbbmFtZV07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgY2RhdGEgPT09IFwidW5kZWZpbmVkXCIpXG4gICAgICAgICAgICAgICAgY2RhdGEgPSBcIlwiO1xuICAgICAgICAgICAgaWYgKGVsLnRhZ05hbWUgPT09IFwiSU5QVVRcIiAmJiBlbC50eXBlID09PSBcImNoZWNrYm94XCIgfHwgZWwudHlwZSA9PT0gXCJyYWRpb1wiKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNkYXRhID09PSBlbC52YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBlbC5jaGVja2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBlbC5jaGVja2VkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBlbC52YWx1ZSA9IGNkYXRhO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3NraXBTZW5kQ2hhbmdlRXZ0ID0gZmFsc2U7XG4gICAgfVxuXG4gICAgZGlzY29ubmVjdGVkQ2FsbGJhY2soKSB7XG4gICAgICAgIHRoaXMuX29ic2VydmVyLmRpc2Nvbm5lY3QoKTtcbiAgICB9XG5cbiAgICBjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICAgICAgdGhpcy5fb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcigoZSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5fdXBkYXRlRWxDb24oKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuX29ic2VydmVyLm9ic2VydmUodGhpcywge2NoaWxkTGlzdDogdHJ1ZSwgc3VidHJlZTogdHJ1ZX0pO1xuICAgICAgICB0aGlzLl91cGRhdGVFbENvbigpO1xuICAgICAgICBpZiAodGhpcy5oYXNBdHRyaWJ1dGUoXCJpbml0XCIpKSB7XG4gICAgICAgICAgICBsZXQgY29kZSA9IHRoaXMuZ2V0QXR0cmlidXRlKFwiaW5pdFwiKTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgZXZhbChjb2RlKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlLCB0aGlzKTtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGV2YWwoXCIke2NvZGV9XCIpIGZhaWxlZDogJHtlfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoXCJrYS1mb3JtXCIsIEthc2ltaXJGb3JtLCB7ZXh0ZW5kczogXCJmb3JtXCJ9KTsiLCJcbmNsYXNzIEthc2ltaXJTZWxlY3QgZXh0ZW5kcyBIVE1MU2VsZWN0RWxlbWVudCB7XG5cblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLl9fJG9wdGlvbnMgPSBbXTtcbiAgICB9XG5cblxuICAgIF91cGRhdGVPcHRpb25zKCkge1xuICAgICAgICAvL2NvbnNvbGUubG9nKFwidXBkYXRlT3B0aW9ucygpXCIpO1xuICAgICAgICBsZXQgdmFsX2tleSA9IFwidmFsdWVcIjtcbiAgICAgICAgbGV0IHRleHRfa2V5ID0gXCJ0ZXh0XCI7XG4gICAgICAgIGlmICh0aGlzLmhhc0F0dHJpYnV0ZShcInZhbHVlX2tleVwiKSlcbiAgICAgICAgICAgIHZhbF9rZXkgPSB0aGlzLmdldEF0dHJpYnV0ZShcInZhbHVlX2tleVwiKTtcbiAgICAgICAgaWYgKHRoaXMuaGFzQXR0cmlidXRlKFwidGV4dF9rZXlcIikpXG4gICAgICAgICAgICB0ZXh0X2tleSA9IHRoaXMuZ2V0QXR0cmlidXRlKFwidGV4dF9rZXlcIik7XG5cbiAgICAgICAgdGhpcy5pbm5lckhUTUwgPSBcIlwiO1xuICAgICAgICBmb3IobGV0IG9wdGlvbiBvZiB0aGlzLl9fJG9wdGlvbnMpIHtcbiAgICAgICAgICAgIGxldCBvcHRFbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJvcHRpb25cIik7XG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbiA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgICAgIG9wdEVsLnZhbHVlID0gb3B0aW9uW3ZhbF9rZXldO1xuICAgICAgICAgICAgICAgIG9wdEVsLmlubmVyVGV4dCA9IG9wdGlvblt0ZXh0X2tleV07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG9wdEVsLnZhbHVlID0gb3B0aW9uO1xuICAgICAgICAgICAgICAgIG9wdEVsLmlubmVyVGV4dCA9IG9wdGlvbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuYXBwZW5kQ2hpbGQob3B0RWwpO1xuICAgICAgICB9XG4gICAgfVxuXG5cbiAgICBjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICAgICAgbGV0IGluaU9wdGlvbnMgPSB0aGlzLiRvcHRpb25zO1xuICAgICAgICBsZXQgdmFsdWUgPSB0aGlzLiR2YWx1ZTtcblxuICAgICAgICAvLyBHZXR0ZXJzIC8gU2V0dGVycyBub3QgcG9zc2libGUgaWYgcHJvcGVydHkgYWxyZWFkeSBkZWZpbmVkLlxuICAgICAgICAvLyBUaGlzIGhhcHBlbnMgaWYgZWxlbWVudCBpcyBsb2FkZWQgYmVmb3JlIGpzXG4gICAgICAgIC8vIFRoZXJlZm9yOiBhcHBseSBvbmx5IG9uIGNvbm5lY3QgYW5kIGtlZXAgdGhlIHByb3BlcnR5IHZhbHVlXG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnJG9wdGlvbnMnLCB7XG4gICAgICAgICAgICBzZXQ6ICh2YWwpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9fJG9wdGlvbnMgPSB2YWw7XG4gICAgICAgICAgICAgICAgdGhpcy5fdXBkYXRlT3B0aW9ucygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldDogKHZhbCkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9fJG9wdGlvbnNcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnJHZhbHVlJywge1xuICAgICAgICAgICAgc2V0OiAodmFsKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy52YWx1ZSA9IHZhbDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXQ6ICh2YWwpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy52YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmICh0eXBlb2YgaW5pT3B0aW9ucyAhPT0gXCJ1bmRlZmluZWRcIilcbiAgICAgICAgICAgIHRoaXMuJG9wdGlvbnMgPSBpbmlPcHRpb25zO1xuICAgICAgICBpZiAodHlwZW9mIHZhbHVlICE9PSBcInVuZGVmaW5lZFwiKVxuICAgICAgICAgICAgdGhpcy4kdmFsdWUgPSB2YWx1ZTtcblxuICAgICAgICBpZiAodGhpcy5oYXNBdHRyaWJ1dGUoXCJpbml0XCIpKSB7XG4gICAgICAgICAgICBsZXQgY29kZSA9IHRoaXMuZ2V0QXR0cmlidXRlKFwiaW5pdFwiKVxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBldmFsKGNvZGUpO1xuICAgICAgICAgICAgfSBjYXRjaCAgKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGUsIHRoaXMpO1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgZXZhbChcIiR7Y29kZX1cIikgZmFpbGVkOiAke2V9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cblxufVxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoXCJrYS1zZWxlY3RcIiwgS2FzaW1pclNlbGVjdCwge2V4dGVuZHM6IFwic2VsZWN0XCJ9KTsiXX0=