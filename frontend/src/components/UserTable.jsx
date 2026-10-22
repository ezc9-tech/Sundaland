import { Table, Badge, Button } from "react-bootstrap";

export default function UserTable({ users, onApprove, onDeny }) {
  return (
    <Table
      responsive
      hover
      className="bg-white shadow-sm align-middle rounded overflow-hidden"
    >
      <thead className="table-light">
        <tr>
          <th>Name</th>
          <th>Role</th>
          <th>Contact Info</th>
          <th className="text-end">Actions</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user.id}>
            <td className="fw-medium">
              {user.firstName} {user.lastName}
            </td>
            <td>
              <Badge bg="secondary" className="text-capitalize">
                {user.role}
              </Badge>
            </td>
            <td>
              <div className="small">
                {user.login?.email || user.email || "No email provided"}
              </div>
              <div className="text-muted small">{user.phoneNumber}</div>
            </td>
            <td className="text-end">
              <Button
                variant="success"
                size="sm"
                className="me-2 fw-medium"
                onClick={() => onApprove(user.id)}
              >
                Approve
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                className="fw-medium"
                onClick={() => onDeny(user.id)}
              >
                Deny
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
