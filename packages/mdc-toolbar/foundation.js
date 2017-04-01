/**
 * Copyright 2017 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {MDCFoundation} from '@material/base';
import {cssClasses, strings, numbers} from './constants';

export default class MDCToolbarFoundation extends MDCFoundation {
  static get cssClasses() {
    return cssClasses;
  }

  static get strings() {
    return strings;
  }

  static get numbers() {
    return numbers;
  }

  static get defaultAdapter() {
    return {
      hasClass: (/* className: string */) => /* boolean */ false,
      addClass: (/* className: string */) => {},
      removeClass: (/* className: string */) => {},
      registerScrollHandler: (/* handler: EventListener */) => {},
      deregisterScrollHandler: (/* handler: EventListener */) => {},
      registerResizeHandler: (/* handler: EventListener */) => {},
      deregisterResizeHandler: (/* handler: EventListener */) => {},
      getViewportWidth: () => /* number */ 0,
      getViewportScrollY: () => /* number */ 0,
      getOffsetHeight: () => /* number */ 0,
      getFlexibleRowElementOffsetHeight: () => /* number */ 0,
      notifyChange: (/* evtData: {flexibleExpansionRatio: number} */) => {},
      setStyleForRootElement: (/* property: string, value: string */) => {},
      setStyleForTitleElement: (/* property: string, value: string */) => {},
      setStyleForFlexibleRowElement: (/* property: string, value: string */) => {},
    };
  }

  constructor(adapter) {
    super(Object.assign(MDCToolbarFoundation.defaultAdapter, adapter));
    this.resizeHandler_ = () => this.setToolbarRowHeight();
    this.scrollHandler_ = () => this.changeFlexibleRowElementStyle();
    this.resizeFrame_ = 0;
    this.scrollFrame_ = 0;
    this.toolbarRowHeight = 0;

    // Initialize toolbar behavior configuaration variables
    // Toolbar fixed behavior
    this.rootHeight = 0;
    // If fixed is targeted only at the last row
    this.fixedLastrow_ = false;

    // Toolbar flexible behavior
    this.flexibleRowMaxHeight = 0;
    // If the first row is flexible
    this.hasFlexibleRow_ = false;
    // If use the default behavior
    this.useFlexDefaultBehavior_ = false;
  }

  init() {
    this.adapter_.addClass(MDCToolbarFoundation.cssClasses.ROOT);
    this.adapter_.registerResizeHandler(this.resizeHandler_);
    this.adapter_.registerScrollHandler(this.scrollHandler_);
    this.setToolbarRowHeight();
    this.rootHeight = this.adapter_.getOffsetHeight();
    this.flexibleRowMaxHeight = this.adapter_.getFlexibleRowElementOffsetHeight();
    this.fixedLastrow_ = this.adapter_.hasClass(MDCToolbarFoundation.cssClasses.FIXED_LASTROW);
    this.hasFlexibleRow_ = this.adapter_.hasClass(MDCToolbarFoundation.cssClasses.TOOLBAR_ROW_FLEXIBLE);
    if (this.hasFlexibleRow_) {
      this.useFlexDefaultBehavior_ = this.adapter_.hasClass(MDCToolbarFoundation.cssClasses.USE_FLEX_DEFAULT_BEHAVIOR);
    }
  }

  destroy() {
    this.adapter_.deregisterResizeHandler(this.resizeHandler_);
    this.adapter_.deregisterScrollHandler(this.scrollHandler_);
  }

  setToolbarRowHeight() {
    if (this.resizeFrame_ !== 0) {
      cancelAnimationFrame(this.resizeFrame_);
    }
    this.resizeFrame_ = requestAnimationFrame(() => {
      return this.setToolbarRowHeight_();
    });
  }

  setToolbarRowHeight_() {
    const breakpoint = MDCToolbarFoundation.numbers.TOOLBAR_MOBILE_BREAKPOINT;
    this.toolbarRowHeight = this.adapter_.getViewportWidth() <= breakpoint ?
      MDCToolbarFoundation.numbers.TOOLBAR_ROW_MOBILE_HEIGHT : MDCToolbarFoundation.numbers.TOOLBAR_ROW_HEIGHT;
  }

  changeFlexibleRowElementStyle() {
    if (this.scrollFrame_ !== 0) {
      cancelAnimationFrame(this.scrollFrame_);
    }
    this.scrollFrame_ = requestAnimationFrame(() => {
      const scrollTop = this.adapter_.getViewportScrollY();
      const flexibleExpansionRatio = this.calculateFlexibleExpansionRatio_(scrollTop);
      this.adapter_.notifyChange(flexibleExpansionRatio);
      this.changeToolbarFlexibleState_(flexibleExpansionRatio);

      if (this.fixedLastrow_ && flexibleExpansionRatio === 0) {
        changeToolbarFixedState_(scrollTop);
      }
      if (this.hasFlexibleRow_) {
        this.changeFlexibleRowElementStyles_(scrollTop);
      }
      this.scrollFrame_ = 0;
    });
  }

  calculateFlexibleExpansionRatio_(scrollTop) {
    // A small delta number is added to handle non flexible case (prevent #DIV0)
    // const delta = 0.001;
    if (this.flexibleRowMaxHeight === this.toolbarRowHeight) {
      return 0;
    } else {
      return Math.max(0, 1 - scrollTop / (this.flexibleRowMaxHeight - this.toolbarRowHeight));
    }
  }

  changeToolbarFixedState_(scrollTop) {
    const maxTranslateYDistance = this.rootHeight - this.toolbarRowHeight;
    const translateDistance = Math.min(scrollTop, maxTranslateYDistance);
    this.adapter_.setStyleForRootElement('transform', `translateY(${-translateDistance}px)`);
    if (translateDistance === maxTranslateYDistance) {
      this.adapter_.addClass(MDCToolbarFoundation.cssClasses.FIXED_AT_LAST_ROW);
    } else {
      this.adapter_.removeClass(MDCToolbarFoundation.cssClasses.FIXED_AT_LAST_ROW);
    }
  }

  changeToolbarFlexibleState_(flexibleExpansionRatio) {
    this.adapter_.removeClass(MDCToolbarFoundation.cssClasses.FLEXIBLE_MAX);
    this.adapter_.removeClass(MDCToolbarFoundation.cssClasses.FLEXIBLE_MIN);
    if (flexibleExpansionRatio === 1) {
      this.adapter_.addClass(MDCToolbarFoundation.cssClasses.FLEXIBLE_MAX);
    } else if (flexibleExpansionRatio === 0) {
      this.adapter_.addClass(MDCToolbarFoundation.cssClasses.FLEXIBLE_MIN);
    }
  }

  changeFlexibleRowElementStyles_(scrollTop) {
    const height = Math.max(0, this.flexibleRowMaxHeight - this.toolbarRowHeight - scrollTop);
    this.adapter_.setStyleForFlexibleRowElement('height', `${height + this.toolbarRowHeight}px`);

    if (this.useFlexDefaultBehavior_) {
      this.changeElementStylesDefaultBehavior_(scrollTop);
    }
  }

  changeElementStylesDefaultBehavior_(scrollTop) {
    const flexibleExpansionRatio = this.calculateFlexibleExpansionRatio_(scrollTop);
    const height = Math.max(0, this.flexibleRowMaxHeight - this.toolbarRowHeight - scrollTop);
    console.log(scrollTop);
    console.log(height);
    const maxTitleSize = MDCToolbarFoundation.numbers.MAX_TITLE_SIZE;
    const minTitleSize = MDCToolbarFoundation.numbers.MIN_TITLE_SIZE;
    const currentTitleSize = (maxTitleSize - minTitleSize) * flexibleExpansionRatio + minTitleSize;
    this.adapter_.setStyleForTitleElement('transform', `translateY(${height}px)`);
    this.adapter_.setStyleForTitleElement('fontSize', `${currentTitleSize}rem`);
  }
}
