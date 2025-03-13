/**
 * Debug utility functions for troubleshooting DOM rendering issues
 */

export const logElementState = (elementId, prefix = '') => {
  if (typeof window === 'undefined') return;
  
  const element = document.getElementById(elementId);
  console.log(`${prefix} Element "${elementId}" exists:`, !!element);
  
  if (element) {
    console.log(`${prefix} Element visibility:`, window.getComputedStyle(element).display);
    console.log(`${prefix} Element content:`, element.innerHTML.slice(0, 100) + '...');
    console.log(`${prefix} Element dimensions:`, {
      width: element.offsetWidth,
      height: element.offsetHeight
    });
  }
};

export const monitorElementChanges = (elementId) => {
  if (typeof window === 'undefined' || !window.MutationObserver) return;
  
  const element = document.getElementById(elementId);
  if (!element) {
    console.log(`Cannot monitor element "${elementId}" - not found in DOM`);
    return;
  }
  
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        console.log(`Element "${elementId}" children changed:`, {
          added: mutation.addedNodes.length,
          removed: mutation.removedNodes.length
        });
      }
      else if (mutation.type === 'attributes') {
        console.log(`Element "${elementId}" attribute "${mutation.attributeName}" changed`);
      }
    });
  });
  
  observer.observe(element, { 
    attributes: true, 
    childList: true, 
    subtree: true 
  });
  
  console.log(`Now monitoring changes to element "${elementId}"`);
  return observer; // Return for cleanup
};

export const injectTestContent = (elementId, content = 'Test content') => {
  if (typeof window === 'undefined') return;
  
  const element = document.getElementById(elementId);
  if (!element) {
    console.log(`Cannot inject into element "${elementId}" - not found in DOM`);
    return;
  }
  
  const testDiv = document.createElement('div');
  testDiv.className = 'debug-test-content';
  testDiv.style.padding = '10px';
  testDiv.style.margin = '10px';
  testDiv.style.border = '2px dashed red';
  testDiv.innerHTML = `
    <h3 style="color: red">Debug Test Content</h3>
    <p>${content}</p>
    <button onclick="this.parentElement.remove()">Remove</button>
  `;
  
  element.appendChild(testDiv);
  console.log(`Test content injected into element "${elementId}"`);
};

export default {
  logElementState,
  monitorElementChanges,
  injectTestContent
};
