/*
Copyright 2011 Google Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.


Based on HTML5Slides from http://code.google.com/p/html5slides/
  Authors: Luke Mah� (code)
           Marcin Wichary (code and design)
           Dominic Mazzoni (browser compatibility)
           Charles Chen (ChromeVox support)

More recently updated with content from http://code.google.com/p/io-2011-slides/

Modified and updated by:
  Authors: Eric Bidelman (ericbidelman@chromium.org)
           Pete LePage (petele@google.com)

*/


// Take care of browser prefixes.
window.URL = window.URL ? window.URL :
             window.webkitURL ? window.webkitURL : null;

window.BlobBuilder = window.WebKitBlobBuilder || window.MozBlobBuilder || window.BlobBuilder;

window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;

window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame ||
                               window.mozRequestAnimationFrame || window.msRequestAnimationFrame;

window.cancelRequestAnimationFrame = window.cancelRequestAnimationFrame ||
    window.webkitCancelRequestAnimationFrame || window.mozCancelRequestAnimationFrame || window.msCancelRequestAnimationFrame;

window.AudioContext = window.AudioContext || window.webkitAudioContext;

const PERMANENT_URL_PREFIX = './';
const SLIDE_CLASSES = ['far-past', 'past', 'current', 'next', 'far-next'];
const PM_TOUCH_SENSITIVITY = 15;
var curSlide;
var _gaq = _gaq || [];


/* Slide movement */

function getSlideEl(no) {
  if ((no < 0) || (no >= slideEls.length)) {
    return null;
  } else {
    return slideEls[no];
  }
};

function updateSlideClass(slideNo, className) {
  var el = getSlideEl(slideNo);

  if (!el) {
    return;
  }

  if (className) {
    el.classList.add(className);
  }

  for (var i in SLIDE_CLASSES) {
    if (className != SLIDE_CLASSES[i]) {
      el.classList.remove(SLIDE_CLASSES[i]);
    }
  }
};

function updateSlides(opt_dontPush) {
  var dontPush = opt_dontPush || false;

  for (var i = 0; i < slideEls.length; i++) {
    switch (i) {
      case curSlide - 2:
        updateSlideClass(i, 'far-past');
        break;
      case curSlide - 1:
        updateSlideClass(i, 'past');
        break;
      case curSlide:
        updateSlideClass(i, 'current');
        break;
      case curSlide + 1:
        updateSlideClass(i, 'next');
        break;
      case curSlide + 2:
        updateSlideClass(i, 'far-next');
        break;
      default:
        updateSlideClass(i);
        break;
    }
  }

  triggerLeaveEvent(curSlide - 1);
  triggerEnterEvent(curSlide);

  window.setTimeout(function() {
    // Hide after the slide
    disableSlideFrames(curSlide - 2);
  }, 301);

  enableSlideFrames(curSlide - 1);
  enableSlideFrames(curSlide + 1);
  enableSlideFrames(curSlide + 2);

  if (isChromeVoxActive()) {
    speakAndSyncToNode(slideEls[curSlide]);
  }

  updateHash(dontPush);
};

function buildNextItem() {
  var toBuild = slideEls[curSlide].querySelector('.to-build');
  var built = slideEls[curSlide].querySelector('.build-current');

  if (built) {
    built.classList.remove('build-current');
    if (built.classList.contains('fade')) {
      built.classList.add('build-fade');
    }
  }

  if (!toBuild) {
    var items = slideEls[curSlide].querySelectorAll('.build-fade');
    for (var j = 0, item; item = items[j]; j++) {
      item.classList.remove('build-fade');
    }
    return false;
  }

  toBuild.classList.remove('to-build');
  toBuild.classList.add('build-current');

  if (isChromeVoxActive()) {
    speakAndSyncToNode(toBuild);
  }

  return true;
};

function prevSlide(opt_dontPush) {
  if (curSlide > 0) {
    curSlide--;

    updateSlides(opt_dontPush);
  }
};

function nextSlide(opt_dontPush) {

  if (buildNextItem()) {
    return;
  }

  if (curSlide < slideEls.length - 1) {
    curSlide++;

    updateSlides(opt_dontPush);
  }
};

/* Slide events */

function triggerEnterEvent(no) {
  var el = getSlideEl(no);
  if (!el) {
    return;
  }

  var onEnter = el.getAttribute('onslideenter');
  if (onEnter) {
    new Function(onEnter).call(el);
  }

  var evt = document.createEvent('Event');
  evt.initEvent('slideenter', true, true);
  evt.slideNumber = no + 1; // Make it readable

  el.dispatchEvent(evt);
};

function triggerLeaveEvent(no) {
  var el = getSlideEl(no);
  if (!el) {
    return;
  }

  var onLeave = el.getAttribute('onslideleave');
  if (onLeave) {
    new Function(onLeave).call(el);
  }

  var evt = document.createEvent('Event');
  evt.initEvent('slideleave', true, true);
  evt.slideNumber = no + 1; // Make it readable

  el.dispatchEvent(evt);
};

/* Touch events */

function handleTouchStart(event) {
  if (event.touches.length == 1) {
    touchDX = 0;
    touchDY = 0;

    touchStartX = event.touches[0].pageX;
    touchStartY = event.touches[0].pageY;

    document.body.addEventListener('touchmove', handleTouchMove, true);
    document.body.addEventListener('touchend', handleTouchEnd, true);
  }
};

function handleTouchMove(event) {
  if (event.touches.length > 1) {
    cancelTouch();
  } else {
    touchDX = event.touches[0].pageX - touchStartX;
    touchDY = event.touches[0].pageY - touchStartY;
  }
};

function handleTouchEnd(event) {
  var dx = Math.abs(touchDX);
  var dy = Math.abs(touchDY);

  if ((dx > PM_TOUCH_SENSITIVITY) && (dy < (dx * 2 / 3))) {
    if (touchDX > 0) {
      prevSlide();
    } else {
      nextSlide();
    }
  }

  cancelTouch();
};

function cancelTouch() {
  document.body.removeEventListener('touchmove', handleTouchMove, true);
  document.body.removeEventListener('touchend', handleTouchEnd, true);
};

/* Preloading frames */

function disableSlideFrames(no) {
  var el = getSlideEl(no);
  if (!el) {
    return;
  }

  var frames = el.getElementsByTagName('iframe');
  for (var i = 0, frame; frame = frames[i]; i++) {
    disableFrame(frame);
  }
};

function enableSlideFrames(no) {
  var el = getSlideEl(no);
  if (!el) {
    return;
  }

  var frames = el.getElementsByTagName('iframe');
  for (var i = 0, frame; frame = frames[i]; i++) {
    enableFrame(frame);
  }
};

function disableFrame(frame) {
  frame.src = 'about:blank';
};

function enableFrame(frame) {
  var src = frame._src;
  if (src && frame.src != src) {
    frame.src = src;
  }
};

function setupFrames() {
  var frames = document.querySelectorAll('iframe');
  for (var i = 0, frame; frame = frames[i]; i++) {
    frame._src = frame.src;
    disableFrame(frame);
  }

  enableSlideFrames(curSlide - 1);
  enableSlideFrames(curSlide);
  enableSlideFrames(curSlide + 1);
  enableSlideFrames(curSlide + 2);
};

function setupInteraction() {
  /* Clicking and tapping */

  var slides = document.querySelector('section.slides');

  var el = document.createElement('div');
  el.className = 'slide-area';
  el.id = 'prev-slide-area';
  el.addEventListener('click', prevSlide, false);
  slides.appendChild(el);

  var el = document.createElement('div');
  el.className = 'slide-area';
  el.id = 'next-slide-area';
  el.addEventListener('click', nextSlide, false);
  slides.appendChild(el);

  /* Swiping */

  document.body.addEventListener('touchstart', handleTouchStart, false);
}

/* ChromeVox support */

function isChromeVoxActive() {
  if (typeof(cvox) == 'undefined') {
    return false;
  } else {
    return true;
  }
};

function speakAndSyncToNode(node) {
  if (!isChromeVoxActive()) {
    return;
  }

  cvox.ChromeVox.navigationManager.switchToStrategy(
      cvox.ChromeVoxNavigationManager.STRATEGIES.LINEARDOM, 0, true);
  cvox.ChromeVox.navigationManager.syncToNode(node);
  cvox.ChromeVoxUserCommands.finishNavCommand('');
  var target = node;
  while (target.firstChild) {
    target = target.firstChild;
  }
  cvox.ChromeVox.navigationManager.syncToNode(target);
};

function speakNextItem() {
  if (!isChromeVoxActive()) {
    return;
  }

  cvox.ChromeVox.navigationManager.switchToStrategy(
      cvox.ChromeVoxNavigationManager.STRATEGIES.LINEARDOM, 0, true);
  cvox.ChromeVox.navigationManager.next(true);
  if (!cvox.DomUtil.isDescendantOfNode(
      cvox.ChromeVox.navigationManager.getCurrentNode(), slideEls[curSlide])){
    var target = slideEls[curSlide];
    while (target.firstChild) {
      target = target.firstChild;
    }
    cvox.ChromeVox.navigationManager.syncToNode(target);
    cvox.ChromeVox.navigationManager.next(true);
  }
  cvox.ChromeVoxUserCommands.finishNavCommand('');
};

function speakPrevItem() {
  if (!isChromeVoxActive()) {
    return;
  }

  cvox.ChromeVox.navigationManager.switchToStrategy(
      cvox.ChromeVoxNavigationManager.STRATEGIES.LINEARDOM, 0, true);
  cvox.ChromeVox.navigationManager.previous(true);
  if (!cvox.DomUtil.isDescendantOfNode(
      cvox.ChromeVox.navigationManager.getCurrentNode(), slideEls[curSlide])){
    var target = slideEls[curSlide];
    while (target.lastChild){
      target = target.lastChild;
    }
    cvox.ChromeVox.navigationManager.syncToNode(target);
    cvox.ChromeVox.navigationManager.previous(true);
  }
  cvox.ChromeVoxUserCommands.finishNavCommand('');
};

/* Hash functions */

function getCurSlideFromHash() {
  var slideNo = parseInt(location.hash.substr(1));

  if (slideNo) {
    curSlide = slideNo - 1;
  } else {
    curSlide = 0;
  }
};

function updateHash(dontPush) {
  if (!dontPush) {
    var slideNo = curSlide + 1;
    var hash = '#' + slideNo;
    if (window.history.pushState) {
      window.history.pushState(slideNo, 'Slide ' + slideNo, hash);
    } else {
      window.location.replace(hash);
    }
    _gaq.push(['_trackPageview', document.location.pathname + document.location.hash]);
  }
}

/* Event listeners */

function handleBodyKeyDown(event) {
  switch (event.keyCode) {
    case 39: // right arrow
    case 34: // PgDn
      nextSlide();
      event.preventDefault();
      break;

    case 37: // left arrow
    case 33: // PgUp
      prevSlide();
      event.preventDefault();
      break;

    case 40: // down arrow
      if (isChromeVoxActive()) {
        speakNextItem();
      } else {
        nextSlide();
      }
      event.preventDefault();
      break;

    case 38: // up arrow
      if (isChromeVoxActive()) {
        speakPrevItem();
      } else {
        prevSlide();
      }
      event.preventDefault();
      break;

    case 78: // N
      document.body.classList.toggle('with-notes');
      break;

    case 27: // ESC
      document.body.classList.remove('with-notes');
      break;

    case 13: // Enter
    case 70: // F
       // Only respect 'f'/enter on body. Don't want to capture keys from <input>
      if (event.target == document.body) {
        if (event.keyCode != 13 && !document.webkitIsFullScreen) {
          document.body.webkitRequestFullScreen();
        } else {
          document.webkitCancelFullScreen();
        }
      }
      break;
  }
};

function handlePopState(event) {
  if (event.state != null) {
    curSlide = event.state - 1;
    updateSlides(true);
  }
};

function addEventListeners() {
  document.addEventListener('keydown', handleBodyKeyDown, false);
  window.addEventListener('popstate', handlePopState, false);
};

/* Initialization */

function addPrettify() {
  var els = document.querySelectorAll('pre');
  for (var i = 0, el; el = els[i]; i++) {
    if (!el.classList.contains('noprettyprint')) {
      el.classList.add('prettyprint');
    }
    el.classList.add('drop-shadow');
    el.classList.add('curved');
    el.classList.add('curved-hz-2');
  }

  var el = document.createElement('script');
  el.type = 'text/javascript';
  el.src = PERMANENT_URL_PREFIX + 'js/prettify.js';
  el.onload = function() {
    prettyPrint();
  }
  document.body.appendChild(el);
};


function addGeneralStyle() {
  var el = document.createElement('link');
  el.rel = 'stylesheet';
  el.type = 'text/css';
  el.href = PERMANENT_URL_PREFIX + 'css/styles.css';
  document.body.appendChild(el);

  var el = document.createElement('meta');
  el.name = 'viewport';
  el.content = 'width=1100,height=750';
  document.querySelector('head').appendChild(el);

  var el = document.createElement('meta');
  el.name = 'apple-mobile-web-app-capable';
  el.content = 'yes';
  document.querySelector('head').appendChild(el);
};

function makeBuildLists() {
  /*for (var i = curSlide, slide; slide = slideEls[i]; i++) {
    var items = slide.querySelectorAll('.build > *');
    for (var j = 0, item; item = items[j]; j++) {
      if (item.classList) {
        item.classList.add('to-build');
        if (item.parentNode.classList.contains('fade')) {
          item.classList.add('fade');
        }
      }
    }
  }*/
};

function handleDomLoaded() {
  slideEls = document.querySelectorAll('section.slides > article:not(.hidden)');

  addGeneralStyle();
  addPrettify();
  addEventListeners();

  updateSlides();

  setupInteraction();
  setupFrames();

  var settings = slidesConfig.settings;
  if (settings.useBuilds) {
    makeBuildLists();
  }
  if (!settings.useGDDBranding) {
    document.querySelector('section.slides').classList.add('nobackground');
  }

  for (var i = 0, slide; slide = slideEls[i]; ++i) {
    slide.dataset.slideNum = i + 1;
    slide.dataset.totalSlides = slideEls.length;
  }

  // Setup Google Analytics
  _gaq.push(['_setAccount', slidesConfig.info.ga_account]);
  _gaq.push(['_trackPageview']);
  _gaq.push(['_trackPageLoadTime']);
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);

  // Set slide config customizations.
  for (var key in slidesConfig.info) {
    var val = slidesConfig.info[key];
    var els = document.querySelectorAll('[data-config-' + key + ']');
    Array.prototype.slice.call(els, 0).forEach(function(el, i) {
      if (!!val.getMonth) {
        el.setAttribute('datetime', val.toISOString().split('T')[0]);

        // Format Date. November 1, 2011
        el.textContent = val.toLocaleDateString().split(',').slice(1).join(', ')
                                                 .trim().replace(/0(\d,)/, '$1');
      } else if ('configLogo' in el.dataset) {
        el.style.backgroundImage = 'url(' + val + ')';
      } else if (el.tagName == 'A') {
        if (val.indexOf('twitter.com') != -1) {
          val = val.substring(val.lastIndexOf('/') + 1);
        }
        el.href = key == 'twitter' ? 'http://twitter.com/' + val : val;
      } else if (el.tagName == 'IMG') {
        el.src = val;
      } else {
        el.innerHTML = val;
      }
    });
  }

  // Map us.
  var maximumAge = 15000;
  var watchID = window.navigator.geolocation.watchPosition(function(position) {
    var lat = position.coords.latitude;
    var lon = position.coords.longitude;
    var url = '//maps.google.com/maps/api/staticmap?center=' + lat + ',' + lon +
              '&zoom=12&size=377x120&maptype=roadmap' +
              '&markers=color:red%7Ccolor:red%7C'+ lat + ',' + lon +
              '&sensor=true';
    document.querySelector('[data-config-map]').src = url;
  }, function(e) {
    console.log('Geolocation error', e);
  }, {enableHighAccuracy: true, maximumAge: maximumAge, timeout: 10000});

  setTimeout(function() {
    window.navigator.geolocation.clearWatch(watchID);
  }, maximumAge);

  // Start Timer
  var t = PresentationTimer(slidesConfig.info.date, slidesConfig.info.minutes, slidesConfig.info.warnAt);
  t.start();

  document.body.classList.add('loaded');
};

function runPreflight(e) {
  util.hide('.checking-compat');
  util.checkWebAudioAPI();
}

function initialize() {
  getCurSlideFromHash();
  document.addEventListener('DOMContentLoaded', handleDomLoaded, false);
  document.addEventListener('DOMContentLoaded', runPreflight, false);
}

initialize();

var util = window.util || {};

util.hide = function(selector) {
  var el = document.querySelector(selector);
  if (el) {
    el.classList.add('hidden');
  }
};

util.unhide = function(selector) {
  var el = document.querySelector(selector);
  if (el) {
    el.classList.remove('hidden');
  }
};

util.checkWebAudioAPI = function() {
  if (!!(window.AudioContext || window.webkitAudioContext)) {
    this.unhide('#feature-web-audio');
    return true;
  } else {
    this.unhide('#feature-no-web-audio');
    return false;
  }
};



var PresentationTimer = function(startTime, presLength, warnAt) {
  var length, stopTime, startImmediately;
  startImmediately = false;
  length = presLength;

  this.start = function() {
    if (!startTime) {
      startTime = new Date();
    }
    stopTime = new Date((startTime.getTime() + (length * 60 * 1000)));
    insertElement();
    setTimeout(timerTick, 1000);
  };

  var insertElement = function() {
    var body = document.getElementsByTagName("body")[0];
    body.insertAdjacentHTML("afterbegin", '<canvas id="cClock" width="30" height="30"></canvas>');
  }

  var timerTick = function() {
    var currentTime = new Date();
    var tickLength = 1000;
    var minLeft;
    if (currentTime < startTime) {
      minLeft = (startTime.getTime() - currentTime.getTime()) / 1000 / 60;
      if (minLeft < 60) {
        drawClock(Math.ceil(minLeft), "#000");
      } else {
        tickLength = 60000;
      }
      setTimeout(timerTick, tickLength);
    } else if (currentTime > stopTime) {
      var minOver = (currentTime.getTime() - stopTime.getTime()) / 1000 / 60;
      if (minOver <= 10) {
        drawClock(Math.ceil(minOver), "#f00");
        setTimeout(timerTick, 15000);
      } else {
        showClock(false);
      }
    } else {
      minLeft = (stopTime.getTime() - currentTime.getTime()) / 1000 / 60;
      var textColor = "#000";
      if (minLeft < warnAt) {
        textColor = "#900";
      }
      drawClock(Math.ceil(minLeft), textColor);
      setTimeout(timerTick, tickLength);
    }
  };

  var drawClock = function(min, color) {
    var canvas = document.getElementById("cClock");
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,30,30);
    ctx.lineWidth = 3;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(15, 15, 10, toRadians(-90), toRadians((((min-60)/60)*360)-90), true);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font="10px sans-serif"
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(min, 15, 15);
  };

  var showClock = function(visible) {
    var canvas = document.getElementById("cClock");
    if (visible) {
      canvas.classList.remove("hidden");
    } else {
      canvas.classList.add("hidden");
    }
  };

  var toRadians = function(val) {
    return (Math.PI / 180) * val;
  };

  if (startImmediately) {
    startTime = new Date();
    start();
  }

  return this;
};





