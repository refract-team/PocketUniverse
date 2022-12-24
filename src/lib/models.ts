/**
 * Server Response Type.
 */
export enum ResponseType {
  /**
   * Simulation was successful.
   */
  Success = 'success',
  /**
   * Simulation was ran but reverted.
   */
  Revert = 'revert',
  /**
   * Unable to simulate, unexpected error.
   */
  Error = 'error',
}

export type Response = {
  readonly type: ResponseType;

  // Only set on success.
  readonly simulation?: Simulation;

  // Might be set on error.
  readonly error?: string;
};

export interface TransactionParams {
  from: string;
  to: string;
  data: string;
  value: string;
}

/// Type of events we care about.
export enum EventType {
  Unknown = 'Unknown',
  TransferIn = 'TransferIn',
  TransferOut = 'TransferOut',
  Approval = 'Approval',
  ApprovalForAll = 'ApprovalForAll',
}

export enum TokenType {
  ERC721 = 'ERC721',
  ERC1155 = 'ERC1155',
  ERC20 = 'ERC20',
}

export class Event {
  constructor(
    public type: EventType,

    // Token type
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
    public toAddress?: string,

    // verified address name.
    public verifiedAddressName?: string,

    /**
     * Whether this NFT is part of a verified collection.
     */
    public verified?: boolean,

    /**
     * The collection this NFT is from.
     */
    public collection_url?: string
  ) {}

  public static eventForEth(type: EventType, value: string): Event {
    return new Event(
      type,
      TokenType.ERC20,
      'ETH',
      'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
      value,
      18,
      undefined,
      undefined,
      true,
      'https://coinmarketcap.com/currencies/ethereum/'
    );
  }

  public static fromJSON(obj: any): Event {
    return new Event(
      obj.type,
      obj.tokenType,
      obj.name,
      obj.image,
      obj.amount,
      obj.decimals,
      obj.toAddress,
      obj.verifiedAddressName,
      obj.verified,
      obj.collection_url
    );
  }
}

/// Represents a single simulation.
export class Simulation {
  constructor(
    public date: number,

    // The events
    public events: Event[],

    // Name of the address if it has been verified.
    public verifiedAddressName?: string,

    // To address to be displayed
    public toAddress?: string,

    // Whether we should warn for an offer.
    public shouldWarn?: boolean,

    public mustWarn?: boolean,

    // Optional message to display when we warn people.
    public mustWarnMessage?: string,
  ) {}

  public static fromJSON(obj: any): Simulation {
    return new Simulation(
      obj.date,
      obj.events.flatMap((event: any) => Event.fromJSON(event)),
      obj.verifiedAddressName,
      obj.toAddress,
      obj.shouldWarn,
      obj.mustWarn,
      obj.mustWarnMessage,
    );
  }
}

export interface SimulationResult {
  success: boolean;
  simulation?: Simulation;
  error?: string;
}
