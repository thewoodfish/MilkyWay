export class MilkyWayError extends Error {
  constructor(
    message: string,
    public readonly type: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = "MilkyWayError";
  }
}

export class ValidationError extends MilkyWayError {
  constructor(message: string) {
    super(message, "validation", 400);
    this.name = "ValidationError";
  }
}

export class PaymentError extends MilkyWayError {
  constructor(message: string) {
    super(message, "payment", 402);
    this.name = "PaymentError";
  }
}

export class DeadlineError extends MilkyWayError {
  constructor() {
    super("Deadline has passed", "deadline", 408);
    this.name = "DeadlineError";
  }
}

export class CapabilityError extends MilkyWayError {
  constructor(name: string, available: string[]) {
    super(
      `Unknown capability: "${name}". Available: ${available.join(", ")}`,
      "capability",
      400
    );
    this.name = "CapabilityError";
  }
}

export class InternalError extends MilkyWayError {
  constructor(message: string) {
    super(message, "internal", 500);
    this.name = "InternalError";
  }
}
