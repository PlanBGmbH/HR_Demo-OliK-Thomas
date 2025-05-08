class Neovis {
    constructor(config) {
        this.config = config;
        this.vis = null;
    }

    initialize(graphData) {
        const { container_id } = this.config;

        // Use the passed graphData to create nodes and edges
        const nodes = new vis.DataSet(graphData.nodes);
        const edges = new vis.DataSet(graphData.edges);

        const data = {
            nodes: nodes,
            edges: edges,
        };

        const options = {
            nodes: {
                shape: 'dot',
                size: 16,
                color: {
                    border: '#2B7CE9',
                    background: '#D2E5FF',
                },
                font: {
                    size: 14,
                    color: '#ffffff',
                },
            },
            edges: {
                color: {
                    color: '#848484',
                    highlight: '#848484',
                    hover: '#848484',
                    opacity: 1.0,
                },
                width: 2,
                arrows: {
                    to: { enabled: true, scaleFactor: 1 },
                },
            },
            physics: {
                enabled: true,
                repulsion: {
                    centralGravity: 0.1,
                    springLength: 200,
                    springConstant: 0.05,
                    nodeDistance: 100,
                    damping: 0.09,
                },
            },
            interaction: {
                dragNodes: true,
                dragView: true,
                hover: true,
                navigationButtons: true,
                selectable: true,
                tooltipDelay: 300,
            },
            layout: {
                hierarchical: {
                    enabled: false,
                },
            },
            manipulation: {
                enabled: true,
                initiallyActive: false,
            },
        };        
        this.vis = new vis.Network(document.getElementById(container_id), data, options);
    }

    render(graphData) {
        if (!this.vis) {
            this.initialize(graphData); //Only initialize once
        } else {
            this.vis.setData({
                nodes: new vis.DataSet(graphData.nodes),
                edges: new vis.DataSet(graphData.edges),
            });
            this.vis.redraw();
        }
    }

    updateWithGraphData(graphData) {
        if (this.vis) {
            this.vis.setData({
                nodes: new vis.DataSet(graphData.nodes),
                edges: new vis.DataSet(graphData.edges),
            });
            this.vis.redraw();
        }
    }
}

// Attach Neovis to the window object to ensure global accessibility
window.Neovis = Neovis;

// Debug statement to check if Neovis is available globally
console.log("Neovis loaded and available globally:", typeof window.Neovis);

console.log("Neovis loaded and available:", typeof Neovis);

