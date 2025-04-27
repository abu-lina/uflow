export default function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-8 text-4xl font-bold">Contact Us</h1>
      <div className="prose prose-lg">
        <p>We&apos;d love to hear from you!</p>
        <div className="mt-8 space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Email</h2>
            <p>support@example.com</p>
          </div>
          <div>
            <h2 className="text-xl font-semibold">Address</h2>
            <p>123 Example Street</p>
            <p>City, State 12345</p>
          </div>
        </div>
      </div>
    </div>
  );
}
