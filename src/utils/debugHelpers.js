/**
 * Debug utility functions for troubleshooting DOM rendering issues
 */

export const logElementState = (elementId, prefix = '') => {
  if (typeof window === 'undefined') return;
  
  const element = document.getElementById(elementId);

  
  if (element) {


    (`${prefix} Element dimensions:`, {
      width: element.offsetWidth,
      height: element.offsetHeight
    });
  }
};

export const monitorElementChanges = (elementId) => {
  if (typeof window === 'undefined' || !window.MutationObserver) return;
  
  const element = document.getElementById(elementId);
  if (!element) {

    return;
  }
  
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        (`Element "${elementId}" children changed:`, {
          added: mutation.addedNodes.length,
          removed: mutation.removedNodes.length
        });
      }
      else if (mutation.type === 'attributes') {

      }
    });
  });
  
  observer.observe(element, { 
    attributes: true, 
    childList: true, 
    subtree: true 
  });
  

  return observer; // Return for cleanup
};

export const injectTestContent = (elementId, content = 'Test content') => {
  if (typeof window === 'undefined') return;
  
  const element = document.getElementById(elementId);
  if (!element) {

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

};

export default {
  logElementState,
  monitorElementChanges,
  injectTestContent
};
