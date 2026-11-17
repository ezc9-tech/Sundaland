import {useState, useEffect} from "react";
import {useParams, useNavigate} from "react-router-dom";
import Navbar from "../components/Navbar";
import {Container, Button, Modal, Form} from "react-bootstrap";
import StarRating from "../components/StarRating";
import toast, {Toaster} from "react-hot-toast";

function ReviewsPage() {
    const {id} = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [rating, setRating] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [mode, setMode] = useState("none");
    const [newRating, setNewRating] = useState(0);
    const [comment, setComment] = useState("");
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [selectedStar, setSelectedStar] = useState(0);

    const [currentUser] = useState(() => {
    const userString = localStorage.getItem("user");
    if (!userString) return null;
    try {
      return JSON.parse(userString);
    } catch {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      return null;
    }
  });

  useEffect(() => {
    const loadReviews = async () => {
        try {
            const productResponse = await fetch(`http://localhost:3000/api/products/${id}`);
            if(!productResponse.ok) {
                throw new Error("Failed to fetch the product");
            }
            const productData = await productResponse.json();
            setProduct(productData.product);

            const summaryResponse = await fetch("http://localhost:3000/api/reviews/summary");
            const summaryData = await summaryResponse.json();
            setRating(summaryData.summary[id] || null);
            const token = localStorage.getItem("token");
            if(!token || !currentUser) {
                return;
            }
            const response = await fetch(`http://localhost:3000/api/reviews/product/${id}`, {
                headers: {Authorization: `Bearer ${token}`},
            });
            if(!response.ok) {
                throw new Error("Failed to fetch the reviews");
            }
            const data = await response.json();
            setReviews(data.reviews || []);
            setMode(data.mode);
            if(data.mode === "edit") {
                setNewRating(data.myReview.rating);
                setComment(data.myReview.comment);
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };
    loadReviews();
  }, [id, currentUser]);

  if (isLoading) {
    return <p>Loading reviews...</p>;
  }
  if(!product) {
    return <p>Product not found.</p>;
  }
  const closeReviewForm = () => {
    setShowReviewForm(false);
  }

  const starCounts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
  for(const review of reviews) {
    starCounts[review.rating] += 1;
  }
  const getPercent = (star) => {
    if(reviews.length === 0) return 0;
    return Math.round((starCounts[star] / reviews.length) * 100);
  }
  const visibleReviews = reviews.filter(
    (review) => selectedStar === 0 || review.rating === selectedStar,
  );

  const handleSubmitReview = async () => {
    if(newRating === 0) {
        toast.error("Please choose a star rating.");
        return;
    }
    if(!comment.trim()) {
        toast.error("A comment is required.");
        return;
    }
    const token = localStorage.getItem("token");
    try {
        const response = await fetch("http://localhost:3000/api/reviews", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                productId: product.id,
                rating: newRating,
                comment: comment.trim(),
            }),
        });
        const data = await response.json();
        if(!response.ok) {
            throw new Error(data.error || "Could not post your review");
        }
        toast.success("Review posted.");
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    } catch (error) {
        toast.error(error.message);
    }
  };

  return (
    <div style={{minHeight: "100vh", backgroundColor: "#f8f9fa"}}>
        <Navbar />
        <Toaster />
        <Modal show={showReviewForm} onHide={closeReviewForm} centered>
            <Modal.Header closeButton>
                <Modal.Title>
                    {mode === "edit" ? "Edit your review" : "Write a review"}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div style={{fontSize: "28px", cursor: "pointer", color: "#f5a623"}}>
                    {[1,2,3,4,5].map((star) => (
                        <span key={star} onClick={() => setNewRating(star)}>
                            {star <= newRating ? "★" : "☆"}
                        </span>
                    ))}
                </div>
                <Form.Control
                    as="textarea"
                    rows={3}
                    maxLength={500}
                    placeholder="What did you think?"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                />
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={closeReviewForm}>Cancel</Button>
                <Button variant="primary" onClick={handleSubmitReview}>
                    {mode === "edit" ? "Update review" : "Post review"}
                </Button>
            </Modal.Footer>
        </Modal>
        <Container>
            <div className="d-flex justify-content-between align-items-center">
                <h1 style={{fontWeight: 700}}>{product.name}</h1>
                <Button variant="primary" onClick={() => navigate(`/product/${product.id}`)}>
                    Back to product
                </Button>
            </div>
            <p style={{color: "#6c757d"}}>Sold by {product.company.name}</p>
            <div style={{display: "flex", flexWrap: "wrap", gap: "32px", marginTop: "20px"}}>
                <div style={{flex: "0 0 300px"}}>
                    <h2 style={{fontWeight: 700}}>Customer reviews</h2>
                    <StarRating rating={rating} />
                    {!currentUser && (
                        <p style={{marginTop: "12px"}}>Log in to see reviews.</p>
                    )}
                    {currentUser && (
                        <div style={{marginTop: "16px"}}>
                            {[5,4,3,2,1].map((star) => (
                                <div
                                    key={star}
                                    className="d-flex align-items-center"
                                    style={{gap: "8px", marginBottom: "8px", cursor: "pointer", fontWeight: selectedStar === star ? 700: 400,}}
                                    onClick={() =>
                                        setSelectedStar(selectedStar === star ? 0: star)
                                    }
                                >
                                    <div style={{width: "50px"}}>{star} star</div>
                                    <div
                                        style={{
                                            flex: 1,
                                            height: "16px",
                                            backgroundColor: "#e9ecef",
                                            borderRadius: "8px",
                                            overflow: "hidden",
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: `${getPercent(star)}%`,
                                                height: "100%",
                                                backgroundColor: "#f5a623",
                                            }}
                                        ></div>
                                    </div>
                                    <div style={{width: "40px", textAlign: "right"}}>
                                        {getPercent(star)}%
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {currentUser?.role === "buyer" && (
                        <div>
                            <hr />
                            <h3 style={{fontWeight: 700, fontSize: "20px"}}>Review this product</h3>
                            {mode === "none" && (
                                <p>You can only review this product once you buy it.</p>
                            )}
                            {mode !== "none" && (
                                <div>
                                    <p>Share your thoughts with other customers</p>
                                    <Button
                                        variant="outline-dark"
                                        style={{width: "100%", borderRadius: "20px"}}
                                        onClick={() => setShowReviewForm(true)}
                                    >
                                        {mode === "edit" ? "Edit your review" : "Write a review"}
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div style={{flex: 1, minWidth: "280px"}}>
                    <div className="d-flex justify-content-between align-items-center">
                        <h2 style={{fontWeight: 700}}>
                            {selectedStar === 0 ? "Reviews" : `${selectedStar} star reviews`}
                        </h2>
                        {selectedStar !== 0 && (
                            <Button variant="link" onClick={() => setSelectedStar(0)}>
                                Show all reviews
                            </Button>
                        )}
                    </div>
                    {currentUser && visibleReviews.length === 0 && (
                        <p>No reviews with this rating</p>
                    )}
                    <div
                        style={{
                            display: "grid",
                            gap: "20px",
                            marginTop: "20px",
                        }}
                    >
                        {visibleReviews.map((review) => (
                            <div
                                key={review.id}
                                style={{
                                    backgroundColor: "white",
                                    borderRadius: "8px",
                                    padding: "24px",
                                }}
                            >
                                <div className="d-flex justify-content-between align-items-center">
                                    <div style={{fontWeight: 600}}>{review.user.firstName}</div>
                                    <div style={{color: "#f5a623"}}>
                                        {"★".repeat(review.rating)}
                                        {"☆".repeat(5-review.rating)}
                                    </div>
                                </div>
                                <div style={{color: "#6b7680"}}>
                                    {new Date(review.createdAt).toLocaleDateString()}
                                </div>
                                <div>{review.comment}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Container>
    </div>
  );
}

export default ReviewsPage;