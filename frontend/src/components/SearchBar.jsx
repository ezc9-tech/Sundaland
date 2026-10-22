import { InputGroup, Form } from "react-bootstrap";

export default function SearchBar({ placeholder, value, onChange }) {
  return (
    <InputGroup style={{ maxWidth: "300px" }}>
      <Form.Control
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    </InputGroup>
  );
}
