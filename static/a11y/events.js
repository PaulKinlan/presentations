// Copyright 2011 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

function callAddEventListener(obj, eventName, listener) {
  if (obj.addEventListener) {
    obj.addEventListener(eventName, listener, true);
  } else if (obj.attachEvent) {
    if (eventName == 'focus') {
      obj.attachEvent('onfocusin', listener);
    } else {
      obj.attachEvent('on' + eventName, listener);
    }
  }
}
function callRemoveEventListener(obj, eventName, listener) {
  if (obj.removeEventListener) {
    obj.removeEventListener(eventName, listener, true);
  } else if (obj.detachEvent) {
    if (eventName == 'focus') {
      obj.detachEvent('onfocusin', listener);
    } else {
      obj.detachEvent('on' + eventName, listener);
    }
  }
}