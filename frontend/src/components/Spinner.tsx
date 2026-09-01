export function Spinner({ small = false }: { small?: boolean }) {
  return <div className={`spinner${small ? ' sm' : ''}`} role="status" aria-label="Loading" />;
}

export function SpinnerBlock() {
  return (
    <div className="spinner-wrap">
      <Spinner />
    </div>
  );
}
