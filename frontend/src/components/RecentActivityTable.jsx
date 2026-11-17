import { useState } from "react";
import { Alert, Button, Modal, Table } from "react-bootstrap";
import PaginationBar from "./PaginationBar";
import SearchBar from "./SearchBar";

const itemsPerPage = 6;

function searchableValues(value) {
  if (value === null || value === undefined) return [];
  if (typeof value === "object") {
    return Object.values(value).flatMap(searchableValues);
  }
  return [String(value).toLowerCase()];
}

function actionLabel(action) {
  return action.replace(/_/g, " ").toLowerCase();
}

export default function RecentActivityTable({ events, listing = false }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const title = listing ? "Recent Listing Changes" : "Recent User Activity";
  const filteredEvents = events.filter((event) =>
    searchableValues({
      ...event,
      displayAction: actionLabel(event.action),
      displayDate: new Date(event.createdAt).toLocaleString(),
    }).some((value) => value.includes(search.trim().toLowerCase())),
  );
  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const currentPage = Math.min(page, Math.max(totalPages, 1));
  const currentEvents = filteredEvents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return (
    <section className="mt-5">
      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
        <h3 className="h4 mb-0">{title}</h3>
        <SearchBar
          placeholder={listing ? "Search listing changes..." : "Search user activity..."}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>
      <p className="text-muted small">Showing up to the 100 most recent events.</p>
      {events.length === 0 ? (
        <Alert variant="info" className="border-0 shadow-sm">
          {listing
            ? "No listing changes have been recorded yet."
            : "No user activity has been recorded yet."}
        </Alert>
      ) : filteredEvents.length === 0 ? (
        <Alert variant="warning" className="border-0 shadow-sm">
          {listing ? "No listing changes match your search." : "No activity matches your search."}
        </Alert>
      ) : (
        <>
          <Table responsive hover className="bg-white shadow-sm align-middle rounded overflow-hidden">
            <thead className="table-light">
              <tr>
                <th scope="col">{listing ? "Listing" : "Account"}</th>
                <th scope="col">Action</th>
                <th scope="col">By</th>
                <th scope="col">Date</th>
                <th scope="col" className="text-end">Details</th>
              </tr>
            </thead>
            <tbody>
              {currentEvents.map((event) => (
                <tr key={event.id}>
                  <td>{listing ? event.productName : event.subjectName || event.actorName}</td>
                  <td className="text-capitalize">{actionLabel(event.action)}</td>
                  <td>
                    <div>{event.actorName}</div>
                    {event.actorEmail && <div className="small text-muted">{event.actorEmail}</div>}
                    <div className="small text-muted text-capitalize">{event.actorRole}</div>
                  </td>
                  <td>{new Date(event.createdAt).toLocaleString()}</td>
                  <td className="text-end">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => setSelectedEvent(event)}
                      aria-label={`View details for ${actionLabel(event.action)} by ${event.actorName}`}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <PaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}
      <Modal show={Boolean(selectedEvent)} onHide={() => setSelectedEvent(null)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>{listing ? "Listing Change" : "User Activity"} Details</Modal.Title>
        </Modal.Header>
        {selectedEvent && (
          <Modal.Body>
            <p>
              <strong>Action:</strong> {actionLabel(selectedEvent.action)}
            </p>
            <p>
              <strong>By:</strong> {selectedEvent.actorName}
              {selectedEvent.actorEmail ? ` (${selectedEvent.actorEmail})` : ""}
              {" - "}
              {selectedEvent.actorRole}
            </p>
            <p>
              <strong>Date:</strong> {new Date(selectedEvent.createdAt).toLocaleString()}
            </p>
            {listing ? (
              <p><strong>Listing:</strong> {selectedEvent.productName}</p>
            ) : (
              <>
                <p>
                  <strong>Entity:</strong> {selectedEvent.entityType}
                  {selectedEvent.entityId ? ` #${selectedEvent.entityId}` : ""}
                </p>
                {selectedEvent.subjectName && (
                  <p>
                    <strong>Account:</strong> {selectedEvent.subjectName}
                    {selectedEvent.subjectEmail ? ` (${selectedEvent.subjectEmail})` : ""}
                  </p>
                )}
              </>
            )}
            {[
              ["Before", selectedEvent.previousData],
              ["After", selectedEvent.currentData],
              ["Details", selectedEvent.details],
            ].map(([label, data]) =>
              data ? (
                <div className="mb-3" key={label}>
                  <strong>{label}</strong>
                  <pre className="bg-light border rounded p-2 mt-1 mb-0 text-wrap">
                    {JSON.stringify(data, null, 2)}
                  </pre>
                </div>
              ) : null,
            )}
          </Modal.Body>
        )}
      </Modal>
    </section>
  );
}
