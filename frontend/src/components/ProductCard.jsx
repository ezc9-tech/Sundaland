import { Card, Button, Badge } from "react-bootstrap";

function ProductCard({ product, onApprove, onDeny }) {
  return (
    <Card className="h-100 shadow-sm border-0">
      <Card.Img
        variant="top"
        src={
          product.pictureUrl ||
          "https://via.placeholder.com/300x200?text=No+Image"
        }
        alt={product.name}
        style={{ height: "200px", objectFit: "cover" }}
      />

      <Card.Body className="d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <Card.Title className="mb-0 fw-bold">{product.name}</Card.Title>
          <Badge bg="success" className="fs-6">
            ${Number(product.price).toFixed(2)}
          </Badge>
        </div>

        <Card.Subtitle className="mb-3 text-muted">
          Seller: {product.company?.name || "Unknown Company"}
        </Card.Subtitle>

        <Card.Text style={{ flexGrow: 1 }}>
          {product.description.length > 100
            ? `${product.description.substring(0, 100)}...`
            : product.description}
        </Card.Text>

        <div className="mb-3 small text-muted">
          <strong>Stock:</strong> {product.inventory} units
        </div>

        <div className="d-flex gap-2 mt-auto">
          <Button
            variant="success"
            className="w-50 fw-semibold"
            onClick={() => onApprove(product.id)}
          >
            Approve
          </Button>
          <Button
            variant="outline-danger"
            className="w-50 fw-semibold"
            onClick={() => onDeny(product.id)}
          >
            Deny
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}

export default ProductCard;
