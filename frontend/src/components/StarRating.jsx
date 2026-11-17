function StarRating({rating}) {
    if (!rating) {
        return <span className="text-muted">No reviews yet</span>;
    }
    const wholeStars = Math.floor(rating.average);
    const halfStars = rating.average % 1 >= 0.5;
    const emptyStars = 5 - wholeStars - (halfStars ? 1: 0);

    return (
        <span>
            <span style={{ color: "#f5a623" }}>
            {"★".repeat(wholeStars)}
            {halfStars ? "⯪" : ""}
            {"☆".repeat(emptyStars)}
            </span>{" "}
            {rating.average.toFixed(1)} ({rating.count}{" "}
            {rating.count === 1 ? "review" : "reviews"})
        </span>
    );
}

export default StarRating;