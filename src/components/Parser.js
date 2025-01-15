class Parser {
    constructor(fileWriter) {
      this.fileWriter = fileWriter;
    }
  
    parse(boundary, buffer) {
      let data = buffer.toString('binary');
      const boundaryString = `--${boundary}`;
      let parts = data.split(boundaryString);
  
      parts.forEach((part) => {
        if (part.includes('Content-Disposition')) {
          let headers = this.getHeaders(part);
          let imageData = this.getImageData(part);
          this.fileWriter(headers, imageData);
        }
      });
    }
  
    getHeaders(part) {
      // Extract headers from part (e.g., Content-ID, Object-ID)
      const headers = {};
      const headerLines = part.split('\r\n');
      headerLines.forEach((line) => {
        if (line.includes('Content-ID')) {
          headers['Content-ID'] = line.split(':')[1].trim();
        }
        if (line.includes('Object-ID')) {
          headers['Object-ID'] = line.split(':')[1].trim();
        }
      });
      return headers;
    }
  
    getImageData(part) {
      // Extract image data from part
      const imageStart = part.indexOf('\r\n\r\n') + 4;
      return part.substring(imageStart);
    }
  }
  
  export default Parser 