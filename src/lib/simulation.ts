// TODO(jqphu): move this to using a server SDK

/// Type of events we care about.
export enum EventType {
  Unknown = 'Unknown',
  TransferIn = 'TransferIn',
  TransferOut = 'TransferOut',
  Approval = 'Approval',
  ApprovalForAll = 'ApprovalForAll',
}

// Token types.
export enum TokenType {
  ERC721 = 'ERC721',
  ERC1155 = 'ERC1155',
  ERC20 = 'ERC20',
}

export class Event {
  constructor(
    public type: EventType,

    public tokenType: TokenType,

    // Name of NFT or token.
    // This is combined with the index for ERC721 e.g. BAYC #1234.
    public name: string | null,

    // Image to display,
    public image: string | null,

    // Amount transferred (1 for ERC721)
    public amount: string | null,

    // Number of decimals (0 for ERC721)
    public decimals: number | null,

    // Address of the contract getting ApprovalForAll
    // Only set for ApprovalForAll.
    // Must use checksum case.
    public toAddress?: string
  ) {}

  public static fromJSON(obj: any): Event {
    return new Event(
      obj.type,
      obj.tokenType,
      obj.name,
      obj.image,
      obj.amount,
      obj.decimals,
      obj.toAddress
    );
  }
}
/// Represents a single simulation.
export class Simulation {
  constructor(
    public date: number,
    // The events
    public events: Event[]
  ) {}

  public static fromJSON(obj: any): Simulation {
    return new Simulation(
      obj.date,
      obj.events.flatMap((event: any) => Event.fromJSON(event))
    );
  }
}
