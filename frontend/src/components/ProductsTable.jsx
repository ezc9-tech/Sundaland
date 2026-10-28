import { Table, Button, Badge } from "react-bootstrap";

export default function ProductsTable({
  products,
  onApprove,
  onDeny,
  onToggleActive,
  readOnly = false,
}) {
  return (
    <Table
      responsive
      hover
      className="bg-white shadow-sm align-middle rounded overflow-hidden"
    >
      <thead className="table-light">
        <tr>
          <th>Product Name</th>
          <th>Price</th>
          <th>Inventory</th>
          {readOnly && <th>Status</th>}
          <th className="text-end">Actions</th>
        </tr>
      </thead>
      <tbody>
        {products.map((product) => (
          <tr key={product.id}>
            <td>
              <div className="fw-medium">{product.name}</div>
              <div
                className="text-muted small text-truncate"
                style={{ maxWidth: "300px" }}
                title={product.description}
              >
                {product.description}
              </div>
            </td>
            <td>${Number(product.price).toFixed(2)}</td>
            <td>{product.inventory}</td>
            {readOnly && (
              <td>
                <Badge bg={product.isActive ? "success" : "secondary"}>
                  {product.isActive ? "Active" : "Disabled"}
                </Badge>
              </td>
            )}
            {readOnly ? (
              <td className="text-end">
                <Button
                  variant={
                    product.isActive ? "outline-danger" : "outline-success"
                  }
                  size="sm"
                  className="fw-medium"
                  onClick={() =>
                    onToggleActive(product.id, !product.isActive)
                  }
                >
                  {product.isActive ? "Disable" : "Enable"}
                </Button>
              </td>
            ) : (
              <td className="text-end">
                <Button
                  variant="success"
                  size="sm"
                  className="me-2 fw-medium"
                  onClick={() => onApprove(product.id)}
                >
                  Approve
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  className="fw-medium"
                  onClick={() => onDeny(product.id)}
                >
                  Deny
                </Button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
