/**
 * Based on https://github.com/jsstyles/css-vendor, but without having to
 * convert between different cases all the time.
 *
 * @flow
 */

import ExecutionEnvironment from 'exenv';
import arrayFind from 'array-find';

const VENDOR_PREFIX_REGEX = /-(moz|webkit|ms|o)-/;

const vendorPrefixes = ['Webkit', 'ms', 'Moz', 'O'];

const infoByCssPrefix = {
  '-moz-': {
    cssPrefix: '-moz-',
    jsPrefix: 'Moz',
    alternativeProperties: {
      // OLD - Firefox 19-
      alignItems: ['MozBoxAlign'],
      flex: ['MozBoxFlex'],
      flexDirection: ['MozBoxOrient'],
      justifyContent: ['MozBoxPack'],
      order: ['MozBoxOrdinalGroup']
    },
    alternativeValues: {
      // OLD - Firefox 19-
      alignItems: {
        'flex-start': ['start'],
        'flex-end': ['end']
      },
      display: {
        flex: ['-moz-box']
      },
      flexDirection: {
        column: ['vertical'],
        row: ['horizontal']
      },
      justifyContent: {
        'flex-start': ['start'],
        'flex-end': ['end'],
        'space-between': ['justify']
      }
    }
  },
  '-ms-': {
    cssPrefix: '-ms-',
    jsPrefix: 'ms',
    alternativeProperties: {
      // TWEENER - IE 10
      alignContent: ['msFlexLinePack'],
      alignItems: ['msFlexAlign'],
      alignSelf: ['msFlexAlignItem'],
      justifyContent: ['msFlexPack'],
      order: ['msFlexOrder']
    },
    alternativeValues: {
      // TWEENER - IE 10
      alignContent: {
        'flex-start': ['start'],
        'flex-end': ['end'],
        'space-between': ['justify'],
        'space-around': ['distribute']
      },
      alignItems: {
        'flex-start': ['start'],
        'flex-end': ['end']
      },
      alignSelf: {
        'flex-start': ['start'],
        'flex-end': ['end']
      },
      display: {
        flex: ['-ms-flexbox'],
        'inline-flex': ['-ms-inline-flexbox']
      },
      justifyContent: {
        'flex-start': ['start'],
        'flex-end': ['end'],
        'space-between': ['justify'],
        'space-around': ['distribute']
      }
    }
  },
  '-o-': {
    cssPrefix: '-o-',
    jsPrefix: 'O'
  },
  '-webkit-': {
    cssPrefix: '-webkit-',
    jsPrefix: 'Webkit',
    alternativeProperties: {
      // OLD - iOS 6-, Safari 3.1-6
      alignItems: ['WebkitBoxAlign'],
      flex: ['MozBoxFlex'],
      flexDirection: ['WebkitBoxOrient'],
      justifyContent: ['WebkitBoxPack'],
      order: ['WebkitBoxOrdinalGroup']
    },
    alternativeValues: {
      // OLD - iOS 6-, Safari 3.1-6
      alignItems: {
        'flex-start': ['start'],
        'flex-end': ['end']
      },
      display: {
        flex: ['-webkit-box']
      },
      flexDirection: {
        row: ['horizontal'],
        column: ['vertical']
      },
      justifyContent: {
        'flex-start': ['start'],
        'flex-end': ['end'],
        'space-between': ['justify']
      }
    }
  }
};

/**
 * CSS properties which accept numbers but are not in units of "px".
 * Copied from React core June 22, 2015.
 * https://github.com/facebook/react/blob/
 * ba81b60ad8e93b747be42a03b797065932c49c96/
 * src/renderers/dom/shared/CSSProperty.js
 */
const isUnitlessNumber = {
  boxFlex: true,
  boxFlexGroup: true,
  columnCount: true,
  flex: true,
  flexGrow: true,
  flexPositive: true,
  flexShrink: true,
  flexNegative: true,
  fontWeight: true,
  lineClamp: true,
  lineHeight: true,
  opacity: true,
  order: true,
  orphans: true,
  tabSize: true,
  widows: true,
  zIndex: true,
  zoom: true,

  // SVG-related properties
  fillOpacity: true,
  strokeDashoffset: true,
  strokeOpacity: true,
  strokeWidth: true
};

let domStyle = {};
const prefixedPropertyCache = {};
const prefixedValueCache = {};
let prefixInfo = {
  cssPrefix: '',
  jsPrefix: ''
};


if (ExecutionEnvironment.canUseDOM) {
  domStyle = (document: any).createElement('p').style;

  // older Firefox versions may have no float property in style object
  // so we need to add it manually
  if (domStyle.float === undefined) {
    domStyle.float = '';
  }

  // Based on http://davidwalsh.name/vendor-prefix
  let prefixMatch;
  const windowStyles = window.getComputedStyle(document.documentElement, '');

  // Array.prototype.slice.call(windowStyles) fails with
  // "Uncaught TypeError: undefined is not a function"
  // in older versions Android (KitKat) web views
  for (let i = 0; i < windowStyles.length; i++) {
    prefixMatch = windowStyles[i].match(VENDOR_PREFIX_REGEX);

    if (prefixMatch) {
      break;
    }
  }

  const cssVendorPrefix = prefixMatch && prefixMatch[0];

  prefixInfo = cssVendorPrefix && infoByCssPrefix[cssVendorPrefix] ?
    infoByCssPrefix[cssVendorPrefix] :
    prefixInfo;
}

const getPrefixedPropertyName = function(property: string): string {
  if (prefixedPropertyCache.hasOwnProperty(property)) {
    return prefixedPropertyCache[property];
  }

  const unprefixed = property;

  // Try the prefixed version first. Chrome in particular has the `filter` and
  // `webkitFilter` properties availalbe on the style object, but only the
  // prefixed version actually works.
  let possiblePropertyNames = [
    // Prefixed
    prefixInfo.jsPrefix + property[0].toUpperCase() + property.slice(1),
    unprefixed
  ];

  // Alternative property names
  if (
    prefixInfo.alternativeProperties &&
    prefixInfo.alternativeProperties[property]
  ) {
    possiblePropertyNames = possiblePropertyNames.concat(
      prefixInfo.alternativeProperties[property]
    );
  }

  const workingProperty = arrayFind(
    possiblePropertyNames,
    function(possiblePropertyName) {
      if (possiblePropertyName in domStyle) {
        return possiblePropertyName;
      }
    }
  ) || false;

  prefixedPropertyCache[property] = workingProperty;

  return prefixedPropertyCache[property];
};

// We are un-prefixing values before checking for isUnitlessNumber,
// otherwise we are at risk of being in a situation where someone
// explicitly passes something like `MozBoxFlex: 1` and that will
// in turn get transformed into `MozBoxFlex: 1px`.
const _getUnprefixedProperty = function(property) {
  let noPrefixProperty = property;

  vendorPrefixes.some(prefix => {
    // Let's check if the property starts with a vendor prefix
    if (property.indexOf(prefix) === 0) {
      noPrefixProperty = noPrefixProperty.replace(
        prefix,
        ''
      );

      // We have removed the vendor prefix, however the first
      // character is going to be uppercase hence won't match
      // any of the `isUnitlessNumber` keys as they all start
      // with lower case. Let's ensure that the first char is
      // lower case.
      noPrefixProperty = noPrefixProperty.charAt(0).toLowerCase() + noPrefixProperty.slice(1);

      return true;
    }
  });

  return noPrefixProperty;
};

// React is planning to deprecate adding px automatically
// (https://github.com/facebook/react/issues/1873), and if they do, this
// should change to a warning or be removed in favor of React's warning.
// Same goes for below.
const _addPixelSuffixToValueIfNeeded = function(originalProperty, value) {
  const unPrefixedProperty = _getUnprefixedProperty(originalProperty);

  if (
    value !== 0 &&
    !isNaN(value) &&
    !isUnitlessNumber[unPrefixedProperty]
  ) {
    return value + 'px';
  }
  return value;
};

const _getPrefixedValue = function(
  componentName,
  property,
  value,
  originalProperty
) {
  if (!Array.isArray(value)) {
    // don't test numbers (pure or stringy), but do add 'px' prefix if needed
    if (!isNaN(value) && value !== null) {
      return _addPixelSuffixToValueIfNeeded(originalProperty, value);
    }

    if (typeof value !== 'string') {
      if (value !== null && value !== undefined) {
        value = value.toString();
      } else {
        return value;
      }
    }

    // don't test numbers with units (e.g. 10em)
    if (!isNaN(parseInt(value, 10))) {
      return value;
    }
  }

  const cacheKey = Array.isArray(value) ? (
    value.join(' || ')
  ) : (
    property + value
  );

  if (prefixedValueCache.hasOwnProperty(cacheKey)) {
    return prefixedValueCache[cacheKey];
  }

  let possibleValues;
  if (Array.isArray(value)) {
    // Add px for the same values React would, otherwise the testing below will
    // fail and it will try to fallback.
    possibleValues = value.map(v =>
      _addPixelSuffixToValueIfNeeded(originalProperty, v)
    );

    // Add prefixed versions
    possibleValues = possibleValues.concat(
      value
        .filter(v => !isNaN(v)) // Don't prefix numbers
        .map(v => prefixInfo.cssPrefix + v)
    );
  } else {
    possibleValues = [
      // Unprefixed
      value,
      // Prefixed
      prefixInfo.cssPrefix + value
    ];
  }

  // Alternative values
  if (
    prefixInfo.alternativeValues &&
    prefixInfo.alternativeValues[originalProperty] &&
    prefixInfo.alternativeValues[originalProperty][value]
  ) {
    possibleValues = possibleValues.concat(
      prefixInfo.alternativeValues[originalProperty][value]
    );
  }

  // Test possible value in order
  const workingValue = arrayFind(
    possibleValues,
    function(possibleValue) {
      domStyle[property] = '';
      domStyle[property] = possibleValue;

      // Note that we just make sure it is not an empty string. Browsers will
      // sometimes rewrite values, but still accept them. They will set the value
      // to an empty string if not supported.
      // E.g. for border, "solid 1px black" becomes "1px solid black"
      //      but "foobar" becomes "", since it is not supported.
      return !!domStyle[property];
    }
  );

  if (workingValue) {
    prefixedValueCache[cacheKey] = workingValue;
  } else {
    // Unsupported, assume unprefixed works, but warn
    prefixedValueCache[cacheKey] = value;

    if (process.env.NODE_ENV !== 'production') {
      /* eslint-disable no-console */
      if (console && console.warn) {
        const componentContext = componentName
          ? ` in component "${componentName}"`
          : '';

        console.warn(
          `Unsupported CSS value "${value}" for property "${property}"` +
            componentContext
        );
      }
      /* eslint-enable no-console */
    }
  }

  return prefixedValueCache[cacheKey];
};

// Returns a new style object with vendor prefixes added to property names
// and values.
const getPrefixedStyle = function(
  style: Object,
  componentName: ?string,
): Object {
  if (!ExecutionEnvironment.canUseDOM) {
    return Object.keys(style).reduce((newStyle, key) => {
      const value = style[key];
      const newValue = Array.isArray(value) ? value[0] : value;
      newStyle[key] = newValue;
      return newStyle;
    }, {});
  }

  const prefixedStyle = {};
  Object.keys(style).forEach(property => {
    const value = style[property];

    const newProperty = getPrefixedPropertyName(property);
    if (!newProperty) {
      // Ignore unsupported properties
      if (process.env.NODE_ENV !== 'production') {
        /* eslint-disable no-console */
        if (console && console.warn) {
          const componentContext = componentName
            ? ` in component "${componentName}"`
            : '';

          console.warn(
            `Unsupported CSS property "${property}"` + componentContext
          );
        }
        /* eslint-enable no-console */
        return;
      }
    }

    const newValue = _getPrefixedValue(componentName, newProperty, value, property);

    prefixedStyle[newProperty] = newValue;
  });
  return prefixedStyle;
};


export default {
  getPrefixedStyle,
  cssPrefix: prefixInfo.cssPrefix,
  jsPrefix: prefixInfo.jsPrefix
};