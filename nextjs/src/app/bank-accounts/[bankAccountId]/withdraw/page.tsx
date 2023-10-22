import { Box } from "@mui/material";

import { WithdrawForm } from "./WithdrawForm";

export default function WithdrawPage({
  params,
}: {
  params: { bankAccountId: string };
}) {
  return (
    <Box>
      <WithdrawForm bankAccountId={params.bankAccountId} />
    </Box>
  );
}
