import { Table, Button, Badge } from "react-bootstrap";

export default function ProductsTable({
  products,
  onApprove,
  onDeny,
  onToggleActive,
  onViewAudit,
  readOnly = false,
  auditMode = false,
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
          {auditMode && <th>Company / Seller</th>}
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
            {auditMode && (
              <td>
                <div>{product.company?.name || "Unknown company"}</div>
                {product.company?.users?.map(({ user }) => (
                  <div key={user.login?.email || `${user.firstName}-${user.lastName}`} className="small text-muted">
                    {user.firstName} {user.lastName}
                    {user.login?.email ? ` (${user.login.email})` : ""}
                  </div>
                ))}
              </td>
            )}
            {readOnly && (
              <td>
                <div className="d-flex flex-column align-items-start gap-1">
                  <Badge bg={product.approved ? "success" : "warning"}>
                    {product.approved ? "Approved" : "Pending"}
                  </Badge>
                  <Badge bg={product.isActive ? "primary" : "secondary"}>
                    {product.isActive ? "Active" : "Disabled"}
                  </Badge>
                </div>
              </td>
            )}
            {readOnly ? (
              <td className="text-end">
                <div className="d-flex justify-content-end gap-2">
                  {auditMode && (
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="fw-medium"
                      onClick={() => onViewAudit(product)}
                    >
                      History
                    </Button>
                  )}
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
                </div>
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
