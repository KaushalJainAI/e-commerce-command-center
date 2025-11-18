import { useEffect, useState, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  ConnectionLineType,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { getProductGraph, saveProductGraph, EdgeType } from '@/api/graph';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Save } from 'lucide-react';

const ProductGraph = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [edgeForm, setEdgeForm] = useState({
    weight: 0.5,
    type: 'similar' as EdgeType,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchGraph();
  }, []);

  const fetchGraph = async () => {
    try {
      const response = await getProductGraph();
      const graphNodes: Node[] = response.data.nodes.map((node) => ({
        id: node.id,
        type: 'default',
        position: node.position,
        data: { label: node.label },
      }));

      const graphEdges: Edge[] = response.data.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: `${edge.type} (${edge.weight})`,
        type: 'smoothstep',
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
        data: { weight: edge.weight, type: edge.type },
      }));

      setNodes(graphNodes);
      setEdges(graphEdges);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load product graph',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge: Edge = {
        ...params,
        id: `edge-${params.source}-${params.target}`,
        type: 'smoothstep',
        label: 'similar (0.5)',
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
        data: { weight: 0.5, type: 'similar' },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge);
    setEdgeForm({
      weight: edge.data?.weight || 0.5,
      type: edge.data?.type || 'similar',
    });
    setDialogOpen(true);
  }, []);

  const handleSaveEdge = () => {
    if (!selectedEdge) return;

    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.id === selectedEdge.id) {
          return {
            ...edge,
            label: `${edgeForm.type} (${edgeForm.weight})`,
            data: { ...edge.data, weight: edgeForm.weight, type: edgeForm.type },
          };
        }
        return edge;
      })
    );

    setDialogOpen(false);
    toast({ title: 'Success', description: 'Edge updated successfully' });
  };

  const handleDeleteEdge = () => {
    if (!selectedEdge) return;
    setEdges((eds) => eds.filter((edge) => edge.id !== selectedEdge.id));
    setDialogOpen(false);
    toast({ title: 'Success', description: 'Edge deleted successfully' });
  };

  const handleSaveGraph = async () => {
    try {
      const graphData = {
        nodes: nodes.map((node) => ({
          id: node.id,
          label: node.data.label,
          position: node.position,
        })),
        edges: edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          weight: edge.data?.weight || 0.5,
          type: edge.data?.type || 'similar',
        })),
      };

      await saveProductGraph(graphData);
      toast({ title: 'Success', description: 'Graph saved successfully' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save graph',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Product Graph</h1>
          <p className="text-muted-foreground">Visualize and edit product relationships</p>
        </div>
        <Button onClick={handleSaveGraph}>
          <Save className="mr-2 h-4 w-4" />
          Save Graph
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Graph Editor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[600px] w-full rounded-lg border bg-background">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onEdgeClick={onEdgeClick}
              connectionLineType={ConnectionLineType.SmoothStep}
              fitView
            >
              <Controls />
              <Background />
            </ReactFlow>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Drag nodes to reposition. Connect nodes to create relationships. Click edges to edit weight and type.
          </p>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Edge</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="weight">Weight (0-1)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={edgeForm.weight}
                onChange={(e) => setEdgeForm({ ...edgeForm, weight: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <Select value={edgeForm.type} onValueChange={(value: EdgeType) => setEdgeForm({ ...edgeForm, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="similar">Similar</SelectItem>
                  <SelectItem value="related">Related</SelectItem>
                  <SelectItem value="combo">Combo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="destructive" onClick={handleDeleteEdge}>
              Delete Edge
            </Button>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdge}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductGraph;
