import { Vector3 } from "../utils/cuon-matrix";

export class OBJDoc {
  fileName: string;
  mtls: MTLDoc[];
  objects: OBJObject[];
  vertices: Vertex[];
  normals: Normal[];

  constructor(fileName: string) {
    this.fileName = fileName;
    this.mtls = new Array(0); // Initialize the property for MTL
    this.objects = new Array(0); // Initialize the property for Object
    this.vertices = new Array(0); // Initialize the property for Vertex
    this.normals = new Array(0); // Initialize the property for Normal
  }

  parse(fileString: string, scale: number, reverse: boolean) {
    var lines: Array<string|null> = fileString.split("\n"); // Break up into lines and store them as array
    lines.push(null); // Append null
    var index = 0; // Initialize index of line

    var currentObject = null;
    var currentMaterialName: string | null = "";

    // Parse line by line
    var line; // A string in the line to be parsed
    var sp = new StringParser(); // Create StringParser
    while ((line = lines[index++]) != null) {
      sp.init(line); // init StringParser
      var command = sp.getWord(); // Get command
      if (command == null) continue; // check null command

      switch (command) {
        case "#":
          continue; // Skip comments
        case "mtllib": // Read Material chunk
          var path = this.parseMtllib(sp, this.fileName);
          var mtl = new MTLDoc(); // Create MTL instance
          this.mtls.push(mtl);
          var request = new XMLHttpRequest();
          request.onreadystatechange = function () {
            if (request.readyState == 4) {
              if (request.status != 404) {
                onReadMTLFile(request.responseText, mtl);
              } else {
                mtl.complete = true;
              }
            }
          };
          request.open("GET", path, true); // Create a request to acquire the file
          request.send(); // Send the request
          continue; // Go to the next line
        case "o":
        case "g": // Read Object name
          var object = this.parseObjectName(sp);
          this.objects.push(object);
          currentObject = object;
          continue; // Go to the next line
        case "v": // Read vertex
          var vertex = this.parseVertex(sp, scale);
          this.vertices.push(vertex);
          continue; // Go to the next line
        case "vn": // Read normal
          var normal = this.parseNormal(sp);
          this.normals.push(normal);
          continue; // Go to the next line
        case "usemtl": // Read Material name
          currentMaterialName = this.parseUsemtl(sp);
          continue; // Go to the next line
        case "f": // Read face
          var face = this.parseFace(
            sp,
            currentMaterialName,
            this.vertices,
            reverse
          );
          currentObject?.addFace(face);
          continue; // Go to the next line
      }
    }

    return true;
  }

  parseMtllib(sp: StringParser, fileName: string) {
    // Get directory path
    var i = fileName.lastIndexOf("/");
    var dirPath = "";
    if (i > 0) dirPath = fileName.substr(0, i + 1);

    return dirPath + sp.getWord(); // Get path
  }

  parseObjectName(sp: StringParser) {
    var name = sp.getWord();
    return new OBJObject(name);
  }

  parseVertex(sp: StringParser, scale: number) {
    var x = sp.getFloat() * scale;
    var y = sp.getFloat() * scale;
    var z = sp.getFloat() * scale;
    return new Vertex(x, y, z);
  }

  parseNormal(sp: StringParser) {
    var x = sp.getFloat();
    var y = sp.getFloat();
    var z = sp.getFloat();
    return new Normal(x, y, z);
  }

  parseUsemtl(sp: StringParser) {
    return sp.getWord();
  }

  parseFace(sp: StringParser, materialName: string | null, vertices: Vertex[], reverse: boolean) {
    var face = new Face(materialName);
    // get indices
    for (;;) {
      var word = sp.getWord();
      if (word == null) break;
      var subWords = word.split("/");
      if (subWords.length >= 1) {
        var vi = parseInt(subWords[0]) - 1;
        face.vIndices.push(vi);
      }
      if (subWords.length >= 3) {
        var ni = parseInt(subWords[2]) - 1;
        face.nIndices.push(ni);
      } else {
        face.nIndices.push(-1);
      }
    }

    // calc normal
    var v0 = [
      vertices[face.vIndices[0]].x,
      vertices[face.vIndices[0]].y,
      vertices[face.vIndices[0]].z,
    ];
    var v1 = [
      vertices[face.vIndices[1]].x,
      vertices[face.vIndices[1]].y,
      vertices[face.vIndices[1]].z,
    ];
    var v2 = [
      vertices[face.vIndices[2]].x,
      vertices[face.vIndices[2]].y,
      vertices[face.vIndices[2]].z,
    ];

    // 面の法線を計算してnormalに設定
    var normal = calcNormal(v0, v1, v2);
    // 法線が正しく求められたか調べる
    if (normal == null) {
      if (face.vIndices.length >= 4) {
        // 面が四角形なら別の3点の組み合わせで法線計算
        var v3 = [
          vertices[face.vIndices[3]].x,
          vertices[face.vIndices[3]].y,
          vertices[face.vIndices[3]].z,
        ];
        normal = calcNormal(v1, v2, v3);
      }
      if (normal == null) {
        // 法線が求められなかったのでY軸方向の法線とする
        normal = new Float32Array([0.0, 1.0, 0.0]);
      }
    }
    if (reverse) {
      normal[0] = -normal[0];
      normal[1] = -normal[1];
      normal[2] = -normal[2];
    }
    face.normal = new Normal(normal[0], normal[1], normal[2]);

    // Devide to triangles if face contains over 3 points.
    if (face.vIndices.length > 3) {
      var n = face.vIndices.length - 2;
      var newVIndices = new Array(n * 3);
      var newNIndices = new Array(n * 3);
      for (var i = 0; i < n; i++) {
        newVIndices[i * 3 + 0] = face.vIndices[0];
        newVIndices[i * 3 + 1] = face.vIndices[i + 1];
        newVIndices[i * 3 + 2] = face.vIndices[i + 2];
        newNIndices[i * 3 + 0] = face.nIndices[0];
        newNIndices[i * 3 + 1] = face.nIndices[i + 1];
        newNIndices[i * 3 + 2] = face.nIndices[i + 2];
      }
      face.vIndices = newVIndices;
      face.nIndices = newNIndices;
    }
    face.numIndices = face.vIndices.length;

    return face;
  }

  isMTLComplete() {
    if (this.mtls.length == 0) return true;
    for (var i = 0; i < this.mtls.length; i++) {
      if (!this.mtls[i].complete) return false;
    }
    return true;
  }

  // Find color by material name
  findColor(name: string | null) {
    for (var i = 0; i < this.mtls.length; i++) {
      for (var j = 0; j < this.mtls[i].materials.length; j++) {
        if (this.mtls[i].materials[j].name == name) {
          return this.mtls[i].materials[j].color;
        }
      }
    }
    return new Color(0.8, 0.8, 0.8, 1);
  }

  getDrawingInfo() {
    // Create an arrays for vertex coordinates, normals, colors, and indices
    var numIndices = 0;
    for (var i = 0; i < this.objects.length; i++) {
      numIndices += this.objects[i].numIndices;
    }
    var numVertices = numIndices;
    var vertices = new Float32Array(numVertices * 3);
    var normals = new Float32Array(numVertices * 3);
    var colors = new Float32Array(numVertices * 4);
    var indices = new Uint16Array(numIndices);

    // Set vertex, normal and color
    var index_indices = 0;
    for (var i = 0; i < this.objects.length; i++) {
      var object = this.objects[i];
      for (var j = 0; j < object.faces.length; j++) {
        var face = object.faces[j];
        var color = this.findColor(face.materialName);
        var faceNormal = face.normal;
        for (var k = 0; k < face.vIndices.length; k++) {
          // Set index
          indices[index_indices] = index_indices;
          // Copy vertex
          var vIdx = face.vIndices[k];
          var vertex = this.vertices[vIdx];
          vertices[index_indices * 3 + 0] = vertex.x;
          vertices[index_indices * 3 + 1] = vertex.y;
          vertices[index_indices * 3 + 2] = vertex.z;
          // Copy color
          colors[index_indices * 4 + 0] = color.r;
          colors[index_indices * 4 + 1] = color.g;
          colors[index_indices * 4 + 2] = color.b;
          colors[index_indices * 4 + 3] = color.a;
          // Copy normal
          var nIdx = face.nIndices[k];
          if (nIdx >= 0) {
            var normal = this.normals[nIdx];
            normals[index_indices * 3 + 0] = normal.x;
            normals[index_indices * 3 + 1] = normal.y;
            normals[index_indices * 3 + 2] = normal.z;
          } else {
            normals[index_indices * 3 + 0] = faceNormal!.x;
            normals[index_indices * 3 + 1] = faceNormal!.y;
            normals[index_indices * 3 + 2] = faceNormal!.z;
          }
          index_indices++;
        }
      }
    }

    return new DrawingInfo(vertices, normals, colors, indices);
  }
}

// Analyze the material file
export function onReadMTLFile(fileString: string, mtl: MTLDoc) {
  var lines: Array<string|null> = fileString.split("\n"); // Break up into lines and store them as array
  lines.push(null); // Append null
  var index = 0; // Initialize index of line

  // Parse line by line
  var line; // A string in the line to be parsed
  var name = ""; // Material name
  var sp = new StringParser(); // Create StringParser
  while ((line = lines[index++]) != null) {
    sp.init(line); // init StringParser
    var command = sp.getWord(); // Get command
    if (command == null) continue; // check null command

    switch (command) {
      case "#":
        continue; // Skip comments
      case "newmtl": // Read Material chunk
        name = mtl.parseNewmtl(sp) || ''; // Get name
        continue; // Go to the next line
      case "Kd": // Read normal
        if (name == "") continue; // Go to the next line because of Error
        var material = mtl.parseRGB(sp, name);
        mtl.materials.push(material);
        name = "";
        continue; // Go to the next line
    }
  }
  mtl.complete = true;
}

//------------------------------------------------------------------------------
// MTLDoc Object
//------------------------------------------------------------------------------
class MTLDoc {
  complete = false; // MTL is configured correctly
  materials = new Array(0);

  parseNewmtl(sp: StringParser) {
    return sp.getWord(); // Get name
  }

  parseRGB(sp: StringParser, name: string) {
    var r = sp.getFloat();
    var g = sp.getFloat();
    var b = sp.getFloat();
    return new Material(name, r, g, b, 1);
  }
}

class Material {
  name: string;
  color;

  constructor(name: string, r: number, g: number, b: number, a: number) {
    this.name = name;
    this.color = new Color(r, g, b, a);
  }
}

//------------------------------------------------------------------------------
// Vertex Object
//------------------------------------------------------------------------------
class Vertex {
  x: number;
  y: number;
  z: number;

  constructor(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

//------------------------------------------------------------------------------
// Normal Object
//------------------------------------------------------------------------------
class Normal {
  x: number;
  y: number;
  z: number;

  constructor(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

//------------------------------------------------------------------------------
// Color Object
//------------------------------------------------------------------------------
class Color {
  r: number;
  g: number;
  b: number;
  a: number;

  constructor(r: number, g: number, b: number, a: number) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }
}

//------------------------------------------------------------------------------
// OBJObject Object
//------------------------------------------------------------------------------
class OBJObject {
  name;
  faces: Face[] = [];
  numIndices = 0;

  constructor(name: string | null) {
    this.name = name;
  }

  addFace(face: Face) {
    this.faces.push(face);
    this.numIndices += face.numIndices;
  }
}

//------------------------------------------------------------------------------
// Face Object
//------------------------------------------------------------------------------
class Face {
  materialName: string | null;
  vIndices: number[] = [];
  nIndices: number[] = [];
  normal: Normal|null = null;
  numIndices = 0;

  constructor(materialName: string| null) {
    this.materialName = materialName;
    if (materialName == null) this.materialName = "";
  }
}

//------------------------------------------------------------------------------
// DrawInfo Object
//------------------------------------------------------------------------------
export class DrawingInfo {
  vertices;
  normals;
  colors;
  indices;

  constructor(vertices: Float32Array, normals: Float32Array, colors: Float32Array, indices: Uint16Array) {
    this.vertices = vertices;
    this.normals = normals;
    this.colors = colors;
    this.indices = indices;
  }
}

//------------------------------------------------------------------------------
// Constructor
class StringParser {
  str = '';
  index = 0;

  init(str: string) {
    this.str = str;
    this.index = 0;
  }

  skipDelimiters() {
    for (var i = this.index, len = this.str.length; i < len; i++) {
      var c = this.str.charAt(i);
      // Skip TAB, Space, '(', ')
      if (c == "\t" || c == " " || c == "(" || c == ")" || c == '"') continue;
      break;
    }
    this.index = i;
  }

  skipToNextWord() {
    this.skipDelimiters();
    var n = getWordLength(this.str, this.index);
    this.index += n + 1;
  }

  getWord() {
    this.skipDelimiters();
    var n = getWordLength(this.str, this.index);
    if (n == 0) return null;
    var word = this.str.substr(this.index, n);
    this.index += n + 1;

    return word;
  }

  getInt() {
    return parseInt(this.getWord() || '0');
  }

  getFloat() {
    return parseFloat(this.getWord()|| '0');
  }
}


// Get the length of word
function getWordLength(str: string, start: number) {
  var n = 0;
  for (var i = start, len = str.length; i < len; i++) {
    var c = str.charAt(i);
    if (c == "\t" || c == " " || c == "(" || c == ")" || c == '"') break;
  }
  return i - start;
}

//------------------------------------------------------------------------------
// Common function
//------------------------------------------------------------------------------
function calcNormal(p0: number[], p1: number[], p2: number[]) {
  // v0: a vector from p1 to p0, v1; a vector from p1 to p2
  var v0 = new Float32Array(3);
  var v1 = new Float32Array(3);
  for (var i = 0; i < 3; i++) {
    v0[i] = p0[i] - p1[i];
    v1[i] = p2[i] - p1[i];
  }

  // The cross product of v0 and v1
  var c = [];
  c[0] = v0[1] * v1[2] - v0[2] * v1[1];
  c[1] = v0[2] * v1[0] - v0[0] * v1[2];
  c[2] = v0[0] * v1[1] - v0[1] * v1[0];

  // Normalize the result
  var v = new Vector3(c);
  v.normalize();
  return v.elements;
}
