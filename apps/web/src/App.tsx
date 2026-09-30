import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "@/lib/queryClient";
import { AppRouter } from "@/router";

const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <AppRouter />
    {(import.meta as any).env?.DEV && <ReactQueryDevtools initialIsOpen={false} />}
  </QueryClientProvider>
);

export default App;
