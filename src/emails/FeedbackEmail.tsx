import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface FeedbackEmailProps {
  name?: string;
  email?: string;
  message: string;
}

export function FeedbackEmail({ name, email, message }: FeedbackEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>New CarePoint feedback</Preview>
      <Body style={{ backgroundColor: "#f8fafc", fontFamily: "Arial, sans-serif" }}>
        <Container style={{ margin: "24px auto", padding: "24px", backgroundColor: "#ffffff", borderRadius: "8px" }}>
          <Heading style={{ marginBottom: "12px" }}>New Feedback</Heading>
          <Text style={{ margin: 0 }}>You received a new feedback message.</Text>
          <Hr style={{ margin: "16px 0" }} />
          <Section>
            <Text style={{ margin: "0 0 8px" }}>
              <strong>Name:</strong> {name || "Anonymous"}
            </Text>
            <Text style={{ margin: "0 0 8px" }}>
              <strong>Email:</strong> {email || "Not provided"}
            </Text>
            <Text style={{ margin: 0 }}>
              <strong>Message:</strong>
            </Text>
            <Text style={{ marginTop: "8px", whiteSpace: "pre-wrap" }}>{message}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
