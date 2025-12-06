function FormError({ message }: { message: string }) {
    return (
      <div className="text-sm text-red-500 text-center p-2 bg-red-50 dark:bg-red-950 rounded-md">
        {message}
      </div>
    );
}

export default FormError;