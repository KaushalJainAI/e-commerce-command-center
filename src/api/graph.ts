import api from './axiosInstance';

export type EdgeType = 'similar' | 'related' | 'combo';

export interface GraphNode {
  id: string;
  label: string;
  position: { x: number; y: number };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
  type: EdgeType;
}

export interface ProductGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export const getProductGraph = () => api.get<ProductGraph>('/graph/products');
export const saveProductGraph = (data: ProductGraph) => api.post('/graph/save', data);
