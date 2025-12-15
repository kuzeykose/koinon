function FormError({ message }: { message: string }) {
  return (
    <div className="text-sm text-destructive text-center p-2 bg-destructive/10 rounded-md">
      {message}
    </div>
  );
}

export default FormError;
