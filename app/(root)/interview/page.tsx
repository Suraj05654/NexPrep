import { getCurrentUser } from "@/lib/actions/auth.action";
import ManualInterviewForm from "@/components/ManualInterviewForm";

const Page = async () => {
  const user = await getCurrentUser();

  return (
    <>
      <h3>Interview generation</h3>
      <ManualInterviewForm userId={user?.id} />
    </>
  );
};

export default Page;
