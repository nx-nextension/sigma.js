import Graph from "graphology";
import Sigma from "sigma";
import faker from "faker";
import chroma from "chroma-js";
import { v4 as uuid } from "uuid";
import SpringSupervisor from "./layout-spring";

// Retrieve the html document for sigma container
const container = document.getElementById("sigma-container") as HTMLElement;

// Create a sample graph
const graph = new Graph();
graph.addNode("Guillaume", { x: 0, y: 0, size: 10, label: "Guillaume", color: chroma.random().hex() });
graph.addNode("Alexis", { x: -5, y: 5, size: 10, label: "Alexis", color: chroma.random().hex() });
graph.addNode("Paul", { x: 5, y: 5, size: 10, label: "Paul", color: chroma.random().hex() });
graph.addNode("Benoit", { x: 0, y: 10, size: 10, label: "Benoit", color: chroma.random().hex() });
graph.addEdge("Guillaume", "Alexis");
graph.addEdge("Alexis", "Benoit");
graph.addEdge("Benoit", "Paul");
graph.addEdge("Paul", "Guillaume");

// Create the spring layout and start it
const layout = new SpringSupervisor(graph);
layout.start();

// Create the sigma
const renderer = new Sigma(graph, container);

//
// Drag'n'drop feature
// ~~~~~~~~~~~~~~~~~~~
//

// State for drag'n'drop
let draggedNode: string | null = null;
let isDragging = false;

// On mouse down on a node
//  - we enable the drag mode
//  - save in the dragged node in the state
//  - highlight the node
renderer.on("downNode", (e) => {
  isDragging = true;
  draggedNode = e.node;
  graph.setNodeAttribute(draggedNode, "highlighted", true);
});

// On mouse down, we disable the autoscale by
//  - force the bbox of the sigma
//  - Disable the camera, so its state will not be updated
renderer.getMouseCaptor().on("mousedown", () => {
  if (!renderer.getCustomBBox()) renderer.setCustomBBox(renderer.getBBox());
  renderer.getCamera().disable();
});

// On mouse up, we reset the autoscale and the dragging mode
renderer.getMouseCaptor().on("mouseup", () => {
  if (draggedNode) {
    graph.removeNodeAttribute(draggedNode, "highlighted");
  }
  isDragging = false;
  draggedNode = null;
  renderer.getCamera().enable();
});

// On mouse move, if the drag mode is enabled, we change the position of the draggedNode
renderer.getMouseCaptor().on("mousemove", (e) => {
  if (!isDragging || !draggedNode) return;

  // Get new position of node
  const pos = renderer.viewportToGraph(e);

  graph.setNodeAttribute(draggedNode, "x", pos.x);
  graph.setNodeAttribute(draggedNode, "y", pos.y);
});

//
// Create node (and edge) by click
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//

// When clicking on the stage, we add a new node and connect it to the closest node
renderer.on("clickStage", ({ event }: { event: { x: number; y: number } }) => {
  // Sigma (ie. graph) and screen (viewport) coordinates are not the same.
  // So we need to translate the screen x & y coordinates to the graph one by calling the sigma helper `viewportToGraph`
  const coordForGraph = renderer.viewportToGraph(event);

  // We create a new node
  const node = {
    ...renderer.viewportToGraph({ x: event.x, y: event.y }),
    size: 10,
    color: chroma.random().hex(),
    label: faker.name.firstName(),
  };

  // Searching the two closest nodes to auto-create an edge to it
  const closestNodes = graph
    .nodes()
    .map((nodeId) => {
      const attrs = graph.getNodeAttributes(nodeId);
      const distance = Math.pow(node.x - attrs.x, 2) + Math.pow(node.y - attrs.y, 2);
      return { nodeId, distance };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 2);

  // We register the new node into graphology instance
  const id = uuid();
  graph.addNode(id, node);

  // We create the edges
  closestNodes.forEach((e) => graph.addEdge(id, e.nodeId));
});
