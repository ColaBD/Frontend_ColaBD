import { JointJSGraph } from "../services/jointjs-data.interface";

export type InfoSchemaColab = {
    schema_id: string | null,
    table_info: JointJSGraph,
}