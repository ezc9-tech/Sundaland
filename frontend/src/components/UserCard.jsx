import { Card, Badge, Button } from "react-bootstrap";

function UserCard({ user, onApprove, onDeny }) {
  return (
    <Card className="h-100 shadow-sm border-0">
      <Card.Body className="d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <Card.Title className="mb-0 fw-bold">
            {user.firstName} {user.lastName}
          </Card.Title>
          <Badge
            bg={user.role === "seller" ? "info" : "secondary"}
            className="text-capitalize px-3 py-2"
          >
            {user.role}
          </Badge>
        </div>

        <Card.Text className="text-muted mb-4">
          <strong>Email:</strong> {user.login?.email || user.email}
          <br />
          <strong>Requested:</strong>{" "}
          {user.createdAt
            ? new Date(user.createdAt).toLocaleDateString()
            : "N/A"}
        </Card.Text>

        <div className="d-flex gap-2 justify-content-between mt-auto">
          <Button
            variant="success"
            onClick={() => onApprove(user.id)}
            title="Approve User"
            className="d-flex align-items-center justify-content-center"
            style={{ width: "40px", height: "40px" }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </Button>
          <Button
            variant="danger"
            onClick={() => onDeny(user.id)}
            title="Deny User"
            className="d-flex align-items-center justify-content-center"
            style={{ width: "40px", height: "40px" }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}

export default UserCard;
