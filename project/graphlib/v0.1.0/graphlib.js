;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var global=self;/*
 * Copyright (c) 2012-2013 Chris Pettitt
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
global.graphlib = require("./index");

},{"./index":2}],2:[function(require,module,exports){
exports.Digraph = require("./lib/Digraph");
exports.alg = {
  isAcyclic: require("./lib/alg/isAcyclic"),
  findCycles: require("./lib/alg/findCycles"),
  tarjan: require("./lib/alg/tarjan"),
  topsort: require("./lib/alg/topsort")
};
exports.data = {
  PriorityQueue: require("./lib/data/PriorityQueue")
};
exports.version = require("./lib/version");

},{"./lib/Digraph":3,"./lib/alg/findCycles":4,"./lib/alg/isAcyclic":5,"./lib/alg/tarjan":6,"./lib/alg/topsort":7,"./lib/data/PriorityQueue":8,"./lib/version":10}],3:[function(require,module,exports){
/*!
 * This file is organized with in the following order:
 *
 * Exports
 * Graph constructors
 * Graph queries (e.g. nodes(), edges()
 * Graph mutators
 * Helper functions
 */

var util = require("./util");

module.exports = Digraph;

/*
 * Constructor to create a new directed multi-graph.
 */
function Digraph() {
  /*! The value assigned to the graph itself */
  this._value = undefined;

  /*! Map of nodeId -> {id, value} */
  this._nodes = {};

  /*! Map of sourceId -> {targetId -> {count, edgeId -> true}} */
  this._inEdges = {};

  /*! Map of targetId -> {sourceId -> {count, edgeId -> true}} */
  this._outEdges = {};

  /*! Map of edgeId -> {id, source, target, value} */
  this._edges = {};

  /*! Used to generate anonymous edge ids */
  this._nextEdgeId = 0;
}

/*
 * Constructs and returns a new graph that includes only the nodes in `us`. Any
 * edges that have both their source and target in the set `us` are also
 * included in the subgraph.
 * 
 * Changes to the graph itself are not reflected in the original graph.
 * However, the values for nodes and edges are not copied. If the values are
 * objects then their changes will be reflected in the original graph and the
 * subgraph.
 *
 * If any of the nodes in `us` are not in this graph this function raises an
 * Error.
 *
 * @param {String[]} us the node ids to include in the subgraph
 */
Digraph.prototype.subgraph = function(us) {
  var g = new Digraph();
  var self = this;

  us.forEach(function(u) { g.addNode(u, self.node(u)); });
  util.values(this._edges).forEach(function(e) {
    if (g.hasNode(e.source) && g.hasNode(e.target)) {
      g.addEdge(e.id, e.source, e.target, self.edge(e.id));
    }
  });

  return g;
};

/*
 * Returns the number of nodes in this graph.
 */
Digraph.prototype.order = function() {
  return Object.keys(this._nodes).length;
};

/*
 * Returns the number of edges in this graph.
 */
Digraph.prototype.size = function() {
  return Object.keys(this._edges).length;
};

/*
 * Accessor for a graph-level value. If called with no arguments this function
 * returns the graph value object. If called with the **value** argument this
 * function sets the value for the graph, replacing the previous value.
 *
 * @param {Object} [value] optional value to set for this graph.
 */
Digraph.prototype.graph = function(value) {
  if (arguments.length === 0) {
    return this._value;
  }
  this._value = value;
};

/*
 * Returns `true` if this graph contains a node with the id `u`. Otherwise
 * returns false.
 *
 * @param {String} u a node id
 */
Digraph.prototype.hasNode = function(u) {
  return u in this._nodes;
};

/*
 * Accessor for node values. If called with a single argument this function
 * returns the value for the node **u**. If called with two arguments, this
 * function assigns **value** as the value for node **u**.
 *
 * If no such node is in the graph this function will throw an Error.
 *
 * @param {String} u a node id
 * @param {Object} [value] option value to set for this node
 */
Digraph.prototype.node = function(u, value) {
  var node = this._strictGetNode(u);
  if (arguments.length === 1) {
    return node.value;
  }
  node.value = value;
};

/*
 * Returns the ids of all nodes in this graph. Use `graph.node(u)` to get the
 * value for a specific node.
 */
Digraph.prototype.nodes = function() {
  var nodes = [];
  this.eachNode(function(id, _) { nodes.push(id); });
  return nodes;
};

/*
 * Applies a function that takes the parameters (`id`, `value`) to each node in
 * the graph in arbitrary order.
 *
 * @param {Function} func the function to apply to each node
 */
Digraph.prototype.eachNode = function(func) {
  for (var k in this._nodes) {
    var node = this._nodes[k];
    func(node.id, node.value);
  }
};

/*
 * Returns all successors of the node with the id `u`. That is, all nodes
 * that have the node `u` as their source are returned.
 * 
 * If no node `u` exists in the graph this function throws an Error.
 *
 * @param {String} u a node id
 */
Digraph.prototype.successors = function(u) {
  this._strictGetNode(u);
  return Object.keys(this._outEdges[u])
               .map(function(v) { return this._nodes[v].id; }, this);
};

/*
 * Returns all predecessors of the node with the id `u`. That is, all nodes
 * that have the node `u` as their target are returned.
 * 
 * If no node `u` exists in the graph this function throws an Error.
 *
 * @param {String} u a node id
 */
Digraph.prototype.predecessors = function(u) {
  this._strictGetNode(u);
  return Object.keys(this._inEdges[u])
               .map(function(v) { return this._nodes[v].id; }, this);
};

/*
 * Returns all nodes that are adjacent to the node with the id `u`. In other
 * words, this function returns the set of all successors and predecessors of
 * node `u`.
 *
 * @param {String} u a node id
 */
Digraph.prototype.neighbors = function(u) {
  this._strictGetNode(u);
  var vs = {};

  Object.keys(this._outEdges[u])
        .map(function(v) { vs[v] = true; });

  Object.keys(this._inEdges[u])
        .map(function(v) { vs[v] = true; });

  return Object.keys(vs)
               .map(function(v) { return this._nodes[v].id; }, this);
};

/*
 * Returns all nodes in the graph that have no in-edges.
 */
Digraph.prototype.sources = function() {
  var self = this;
  return this._filterNodes(function(u) {
    // This could have better space characteristics if we had an inDegree function.
    return self.inEdges(u).length === 0;
  });
};

/*
 * Returns all nodes in the graph that have no out-edges.
 */
Digraph.prototype.sinks = function() {
  var self = this;
  return this._filterNodes(function(u) {
    // This could have better space characteristics if we have an outDegree function.
    return self.outEdges(u).length === 0;
  });
};

/*
 * Returns `true` if this graph has an edge with the id `e`. Otherwise this
 * function returns `false`.
 *
 * @param {String} e an edge id
 */
Digraph.prototype.hasEdge = function(e) {
  return e in this._edges;
};

/*
 * Accessor for edge values. If called with a single argument this function
 * returns the value for the edge **e**. If called with two arguments, this
 * function assigns **value** as the value for edge **e**.
 *
 * If no such edge is in the graph this function will throw an Error.
 *
 * @param {String} e an edge id
 * @param {Object} [value] option value to set for this node
 */
Digraph.prototype.edge = function(e, value) {
  var edge = this._strictGetEdge(e);
  if (arguments.length === 1) {
    return edge.value;
  }
  edge.value = value;
};

/*
 * Returns the ids of all edges in the graph.
 */
Digraph.prototype.edges = function(u) {
  if (arguments.length === 1) {
    throw new Error("Digraph.edges() cannot be called with 1 argument. " +
                    "Use Digraph.incidentEdges() instead.");
  } else if (arguments.length > 1) {
    throw new Error("Digraph.edges() cannot be called with more than 1 argument. " +
                    "Use Digraph.outEdges() instead.");
  }

  var es = [];
  this.eachEdge(function(id) { es.push(id); });
  return es;
};

/*
 * Applies a function that takes the parameters (`id`, `source`, `target`,
 * `value`) to each edge in this graph in arbitrary order.
 *
 * @param {Function} func a function to apply to each edge
 */
Digraph.prototype.eachEdge = function(func) {
  for (var k in this._edges) {
    var edge = this._edges[k];
    func(edge.id, edge.source, edge.target, edge.value);
  }
};

/*
 * Returns the source node incident on the edge identified by the id `e`. If no
 * such edge exists in the graph this function throws an Error.
 *
 * @param {String} e an edge id
 */
Digraph.prototype.source = function(e) {
  return this._strictGetEdge(e).source;
};

/*
 * Returns the target node incident on the edge identified by the id `e`. If no
 * such edge exists in the graph this function throws an Error.
 *
 * @param {String} e an edge id
 */
Digraph.prototype.target = function(e) {
  return this._strictGetEdge(e).target;
};

/*
 * Returns an array of ids for all edges in the graph that have the node
 * `target` as their target. If the node `target` is not in the graph this
 * function raises an Error.
 *
 * Optionally a `source` node can also be specified. This causes the results
 * to be filtered such that only edges from `source` to `target` are included.
 * If the node `source` is specified but is not in the graph then this function
 * raises an Error.
 *
 * @param {String} target the target node id
 * @param {String} [source] an optional source node id
 */
Digraph.prototype.inEdges = function(target, source) {
  this._strictGetNode(target);
  var results = util.concat(util.values(this._inEdges[target])
                    .map(function(es) { return Object.keys(es.edges); }, this));
  if (arguments.length > 1) {
    this._strictGetNode(source);
    results = results.filter(function(e) { return this.source(e) === source; }, this);
  }
  return results;
};

/*
 * Returns an array of ids for all edges in the graph that have the node
 * `source` as their source. If the node `source` is not in the graph this
 * function raises an Error.
 *
 * Optionally a `target` node may also be specified. This causes the results
 * to be filtered such that only edges from `source` to `target` are included.
 * If the node `target` is specified but is not in the graph then this function
 * raises an Error.
 *
 * @param {String} source the source node id
 * @param {String} [target] an optional target node id
 */
Digraph.prototype.outEdges = function(source, target) {
  this._strictGetNode(source);
  var results =  util.concat(util.values(this._outEdges[source])
                     .map(function(es) { return Object.keys(es.edges); }, this));
  if (arguments.length > 1) {
    this._strictGetNode(target);
    results = results.filter(function(e) { return this.target(e) === target; }, this);
  }
  return results;
};

/*
 * Returns an array of ids for all edges in the graph that have the `u` as
 * their source or their target. If the node `u` is not in the graph this
 * function raises an Error.
 *
 * Optionally a `v` node may also be specified. This causes the results to be
 * filtered such that only edges between `u` and `v` - in either direction -
 * are included. IF the node `v` is specified but not in the graph then this
 * function raises an Error.
 *
 * @param {String} u the node for which to find incident edges
 * @param {String} [v] option node that must be adjacent to `u`
 */
Digraph.prototype.incidentEdges = function(u, v) {
  if (arguments.length > 1) {
    return util.mergeKeys([this.outEdges(u, v), this.outEdges(v, u)]);
  } else {
    return util.mergeKeys([this.inEdges(u), this.outEdges(u)]);
  }
};

/*
 * Returns `true` if the values of all nodes and all edges are equal (===)
 *
 * @param {Digraph} other the graph to test for equality with this graph
 */
Digraph.prototype.equals = function(other) {
  var self = this;

  return self.order() === other.order() &&
         self.size() === other.size() &&
         util.all(self.nodes(), function(x) { return other.hasNode(x) && self.node(x) === other.node(x); }) &&
         util.all(self.edges(), function(x) { return other.hasEdge(x) && self.edge(x) === other.edge(x); });
};

/*
 * Returns a string representation of this graph.
 */
Digraph.prototype.toString = function() {
  var self = this;
  var str = "GRAPH: " + JSON.stringify(self._value) + "\n";
  str += "    Nodes:\n";
  Object.keys(this._nodes)
        .forEach(function(u) {
          str += "        " + u + ": " + JSON.stringify(self._nodes[u].value) + "\n";
        });

  str += "    Edges:\n";
  Object.keys(this._edges)
        .forEach(function(e) {
          var edge = self._edges[e];
          str += "        " + e + " (" + edge.source + " -> " + edge.target + "): " +
                 JSON.stringify(self._edges[e].value) + "\n";
        });

  return str;
};

/*
 * Adds a new node with the id `u` to the graph and assigns it the value
 * `value`. If a node with the id is already a part of the graph this function
 * throws an Error.
 *
 * @param {String} u a node id
 * @param {Object} [value] an optional value to attach to the node
 */
Digraph.prototype.addNode = function(u, value) {
  if (this.hasNode(u)) {
    throw new Error("Graph already has node '" + u + "':\n" + this.toString());
  }
  this._nodes[u] = { id: u, value: value };
  this._inEdges[u] = {};
  this._outEdges[u] = {};
};

/*
 * Removes a node from the graph that has the id `u`. Any edges incident on the
 * node are also removed. If the graph does not contain a node with the id this
 * function will throw an Error.
 *
 * @param {String} u a node id
 */
Digraph.prototype.delNode = function(u) {
  this._strictGetNode(u);

  var self = this;
  this.incidentEdges(u).forEach(function(e) { self.delEdge(e); });

  delete this._inEdges[u];
  delete this._outEdges[u];
  delete this._nodes[u];
};

/*
 * Adds a new edge to the graph with the id `e` from a node with the id `source`
 * to a noce with an id `target` and assigns it the value `value`. This graph
 * allows more than one edge from `source` to `target` as long as the id `e`
 * is unique in the set of edges. If `e` is `null` the graph will assign a
 * unique identifier to the edge.
 *
 * If `source` or `target` are not present in the graph this function will
 * throw an Error.
 *
 * @param {String} [e] an edge id
 * @param {String} source the source node id
 * @param {String} target the target node id
 * @param {Object} [value] an optional value to attach to the edge
 */
Digraph.prototype.addEdge = function(e, source, target, value) {
  this._strictGetNode(source);
  this._strictGetNode(target);

  if (e === null) {
    e = "_ANON-" + (++this._nextEdgeId);
  }
  else if (this.hasEdge(e)) {
    throw new Error("Graph already has edge '" + e + "':\n" + this.toString());
  }

  this._edges[e] = { id: e, source: source, target: target, value: value };
  addEdgeToMap(this._inEdges[target], source, e);
  addEdgeToMap(this._outEdges[source], target, e);
};

/*
 * Removes an edge in the graph with the id `e`. If no edge in the graph has
 * the id `e` this function will throw an Error.
 *
 * @param {String} e an edge id
 */
Digraph.prototype.delEdge = function(e) {
  var edge = this._strictGetEdge(e);
  delEdgeFromMap(this._inEdges[edge.target], edge.source, e);
  delEdgeFromMap(this._outEdges[edge.source], edge.target, e);
  delete this._edges[e];
};

Digraph.prototype._strictGetNode = function(u) {
  var node = this._nodes[u];
  if (node === undefined) {
    throw new Error("Node '" + u + "' is not in graph:\n" + this.toString());
  }
  return node;
};

Digraph.prototype._strictGetEdge = function(e) {
  var edge = this._edges[e];
  if (edge === undefined) {
    throw new Error("Edge '" + e + "' is not in graph:\n" + this.toString());
  }
  return edge;
};

Digraph.prototype._filterNodes = function(pred) {
  var filtered = [];
  this.eachNode(function(u, value) {
    if (pred(u)) {
      filtered.push(u);
    }
  });
  return filtered;
};

function addEdgeToMap(map, v, e) {
  var vEntry = map[v];
  if (!vEntry) {
    vEntry = map[v] = { count: 0, edges: {} };
  }
  vEntry.count++;
  vEntry.edges[e] = true;
}

function delEdgeFromMap(map, v, e) {
  var vEntry = map[v];
  if (--vEntry.count === 0) {
    delete map[v];
  } else {
    delete vEntry.edges[e];
  }
}


},{"./util":9}],4:[function(require,module,exports){
var tarjan = require("./tarjan");

module.exports = findCycles;

/*
 * Given a Digraph **g** this function returns all nodes that are part of a
 * cycle. Since there may be more than one cycle in a graph this function
 * returns an array of these cycles, where each cycle is itself represented
 * by an array of ids for each node involved in that cycle.
 *
 * [alg.isAcyclic][] is more efficient if you only need to determine whether
 * a graph has a cycle or not.
 *
 * [alg.isAcyclic]: isAcyclic.js.html#isAcyclic
 *
 * @param {Digraph} g the graph to search for cycles.
 */
function findCycles(g) {
  return tarjan(g).filter(function(cmpt) { return cmpt.length > 1; });
}

},{"./tarjan":6}],5:[function(require,module,exports){
var topsort = require("./topsort");

module.exports = isAcyclic;

/*
 * Given a Digraph **g** this function returns `true` if the graph has no
 * cycles and returns `false` if it does. This algorithm returns as soon as it
 * detects the first cycle.
 *
 * Use [alg.findCycles][] if you need the actual list of cycles in a graph.
 *
 * [alg.findCycles]: findCycles.js.html#findCycles
 *
 * @param {Digraph} g the graph to test for cycles
 */
function isAcyclic(g) {
  try {
    topsort(g);
  } catch (e) {
    if (e instanceof topsort.CycleException) return false;
    throw e;
  }
  return true;
}

},{"./topsort":7}],6:[function(require,module,exports){
module.exports = tarjan;

/*
 * This function is an implementation of [Tarjan's algorithm][] which finds
 * all [strongly connected components][] in the directed graph **g**. Each
 * strongly connected component is composed of nodes that can reach all other
 * nodes in the component via directed edges. A strongly connected component
 * can consist of a single node if that node cannot both reach and be reached
 * by any other specific node in the graph. Components of more than one node
 * are guaranteed to have at least one cycle.
 *
 * This function returns an array of components. Each component is itself an
 * array that contains the ids of all nodes in the component.
 *
 * @param {Digraph} g the graph to search for strongly connected components
 *
 * [Tarjan's algorithm]: http://en.wikipedia.org/wiki/Tarjan's_strongly_connected_components_algorithm
 * [strongly connected components]: http://en.wikipedia.org/wiki/Strongly_connected_component
 */
function tarjan(g) {
  var index = 0,
      stack = [],
      visited = {}; // node id -> { onStack, lowlink, index }
      results = [];

  function dfs(u) {
    var entry = visited[u] = {
      onStack: true,
      lowlink: index,
      index: index++
    };
    stack.push(u);

    g.successors(u).forEach(function(v) {
      if (!(v in visited)) {
        dfs(v);
        entry.lowlink = Math.min(entry.lowlink, visited[v].lowlink);
      } else if (visited[v].onStack) {
        entry.lowlink = Math.min(entry.lowlink, visited[v].index);
      }
    });

    if (entry.lowlink === entry.index) {
      var cmpt = [],
          v;
      do {
        v = stack.pop();
        visited[v].onStack = false;
        cmpt.push(v);
      } while (u !== v);
      results.push(cmpt);
    }
  }

  g.nodes().forEach(function(u) {
    if (!(u in visited)) {
      dfs(u);
    }
  });

  return results;
}

},{}],7:[function(require,module,exports){
module.exports = topsort;
topsort.CycleException = CycleException;

/*
 * Given a graph **g**, this function returns an ordered list of nodes such
 * that for each edge `u -> v`, `u` appears before `v` in the list. If the
 * graph has a cycle it is impossible to generate such a list and
 * **CycleException** is thrown.
 *
 * See [topological sorting](https://en.wikipedia.org/wiki/Topological_sorting)
 * for more details about how this algorithm works.
 *
 * @param {Digraph} g the graph to sort
 */
function topsort(g) {
  var visited = {};
  var stack = {};
  var results = [];

  function visit(node) {
    if (node in stack) {
      throw new CycleException();
    }

    if (!(node in visited)) {
      stack[node] = true;
      visited[node] = true;
      g.predecessors(node).forEach(function(pred) {
        visit(pred);
      });
      delete stack[node];
      results.push(node);
    }
  }

  var sinks = g.sinks();
  if (g.order() !== 0 && sinks.length === 0) {
    throw new CycleException();
  }

  g.sinks().forEach(function(sink) {
    visit(sink);
  });

  return results;
}

function CycleException() {}

CycleException.prototype.toString = function() {
  return "Graph has at least one cycle";
};

},{}],8:[function(require,module,exports){
module.exports = PriorityQueue;

/**
 * A min-priority queue data structure. This algorithm is derived from Cormen,
 * et al., "Introduction to Algorithms". The basic idea of a min-priority
 * queue is that you can efficiently (in O(1) time) get the smallest key in
 * the queue. Adding and removing elements takes O(log n) time. A key can
 * have its priority decreased in O(log n) time.
 */
function PriorityQueue() {
  this._arr = [];
  this._keyIndices = {};
}

/**
 * Returns the number of elements in the queue. Takes `O(1)` time.
 */
PriorityQueue.prototype.size = function() {
  return this._arr.length;
};

/**
 * Returns the keys that are in the queue. Takes `O(n)` time.
 */
PriorityQueue.prototype.keys = function() {
  return this._arr.map(function(x) { return x.key; });
};

/**
 * Returns `true` if **key** is in the queue and `false` if not.
 */
PriorityQueue.prototype.has = function(key) {
  return key in this._keyIndices;
};

/**
 * Returns the priority for **key**. If **key** is not present in the queue
 * then this function returns `undefined`. Takes `O(1)` time.
 *
 * @param {Object} key
 */
PriorityQueue.prototype.priority = function(key) {
  var index = this._keyIndices[key];
  if (index !== undefined) {
    return this._arr[index].priority;
  }
};

/**
 * Returns the key for the minimum element in this queue. If the queue is
 * empty this function throws an Error. Takes `O(1)` time.
 */
PriorityQueue.prototype.min = function(key) {
  if (this.size() === 0) {
    throw new Error("Queue underflow");
  }
  return this._arr[0].key;
};

/**
 * Inserts a new key into the priority queue. If the key already exists in
 * the queue this function returns `false`; otherwise it will return `true`.
 * Takes `O(n)` time.
 *
 * @param {Object} key the key to add
 * @param {Number} priority the initial priority for the key
 */
PriorityQueue.prototype.add = function(key, priority) {
  if (!(key in this._keyIndices)) {
    var entry = {key: key, priority: priority};
    var index = this._arr.length;
    this._keyIndices[key] = index;
    this._arr.push(entry);
    this._decrease(index);
    return true;
  }
  return false;
};

/**
 * Removes and returns the smallest key in the queue. Takes `O(log n)` time.
 */
PriorityQueue.prototype.removeMin = function() {
  this._swap(0, this._arr.length - 1);
  var min = this._arr.pop();
  delete this._keyIndices[min.key];
  this._heapify(0);
  return min.key;
};

/**
 * Decreases the priority for **key** to **priority**. If the new priority is
 * greater than the previous priority, this function will throw an Error.
 *
 * @param {Object} key the key for which to raise priority
 * @param {Number} priority the new priority for the key
 */
PriorityQueue.prototype.decrease = function(key, priority) {
  var index = this._keyIndices[key];
  if (priority > this._arr[index].priority) {
    throw new Error("New priority is greater than current priority. " +
        "Key: " + key + " Old: " + this._arr[index].priority + " New: " + priority);
  }
  this._arr[index].priority = priority;
  this._decrease(index);
};

PriorityQueue.prototype._heapify = function(i) {
  var arr = this._arr;
  var l = 2 * i,
      r = l + 1,
      largest = i;
  if (l < arr.length) {
    largest = arr[l].priority < arr[largest].priority ? l : largest;
    if (r < arr.length) {
      largest = arr[r].priority < arr[largest].priority ? r : largest;
    }
    if (largest !== i) {
      this._swap(i, largest);
      this._heapify(largest);
    }
  }
};

PriorityQueue.prototype._decrease = function(index) {
  var arr = this._arr;
  var priority = arr[index].priority;
  var parent;
  while (index > 0) {
    parent = index >> 1;
    if (arr[parent].priority < priority) {
      break;
    }
    this._swap(index, parent);
    index = parent;
  }
};

PriorityQueue.prototype._swap = function(i, j) {
  var arr = this._arr;
  var keyIndices = this._keyIndices;
  var tmp = arr[i];
  arr[i] = arr[j];
  arr[j] = tmp;
  keyIndices[arr[i].key] = i;
  keyIndices[arr[j].key] = j;
};

},{}],9:[function(require,module,exports){
// Returns `true` only if `f(x)` is `true` for all `x` in **xs**. Otherwise
// returns `false`. This function will return immediately if it finds a
// case where `f(x)` does not hold.
exports.all = function(xs, f) {
  for (var i = 0; i < xs.length; ++i) {
    if (!f(xs[i])) return false;
  }
  return true;
}

// Returns an array of all values for properties of **o**.
exports.values = function(o) {
  return Object.keys(o).map(function(k) { return o[k]; });
}

// Joins all of the arrays **xs** into a single array.
exports.concat = function(xs) {
  return Array.prototype.concat.apply([], xs);
}

// Similar to **concat**, but all duplicates are removed
exports.mergeKeys = function(xs) {
  var obj = {};
  xs.forEach(function(x) {
    x.forEach(function(o) {
      obj[o] = o;
    });
  });
  return exports.values(obj);
}

},{}],10:[function(require,module,exports){
module.exports = '0.1.0';

},{}]},{},[1])
;