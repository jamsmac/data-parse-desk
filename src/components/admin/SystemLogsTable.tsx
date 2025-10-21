import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface CreditTransaction {
  id: string;
  user_id: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
  operation_type: string;
}

export function SystemLogsTable() {
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["credit-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as CreditTransaction[];
    },
  });

  if (isLoading) {
    return <div className="text-center py-8">Загрузка логов...</div>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Дата</TableHead>
            <TableHead>Тип</TableHead>
            <TableHead>Операция</TableHead>
            <TableHead>Сумма</TableHead>
            <TableHead>Баланс после</TableHead>
            <TableHead>Описание</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions?.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell>
                {format(new Date(transaction.created_at), "dd MMM yyyy HH:mm", {
                  locale: ru,
                })}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    transaction.transaction_type === "credit"
                      ? "default"
                      : "secondary"
                  }
                >
                  {transaction.transaction_type === "credit"
                    ? "Пополнение"
                    : "Списание"}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{transaction.operation_type}</Badge>
              </TableCell>
              <TableCell
                className={
                  transaction.transaction_type === "credit"
                    ? "text-green-600"
                    : "text-red-600"
                }
              >
                {transaction.transaction_type === "credit" ? "+" : "-"}
                {transaction.amount.toFixed(2)}
              </TableCell>
              <TableCell>{transaction.balance_after.toFixed(2)}</TableCell>
              <TableCell className="max-w-xs truncate">
                {transaction.description}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
