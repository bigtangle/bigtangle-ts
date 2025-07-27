import { Message } from './Message';
import { NetworkParameters } from '../params/NetworkParameters';
import { MessageSerializer } from './MessageSerializer';
import { Buffer } from 'buffer';
import { ProtocolVersion } from './ProtocolVersion';

/**
 * <p>Represents a Message type that can be contained within another Message.  ChildMessages that have a cached
 * backing byte array need to invalidate their parent's caches as well as their own if they are modified.</p>
 * 
 * <p>Instances of this class are not safe for use by multiple threads.</p>
 */
export abstract class ChildMessage extends Message {

    public parent: Message | null;

    constructor(params: NetworkParameters, payload?: Buffer, offset: number = 0, serializer?: MessageSerializer<any>, parent?: Message) {
        // Call the parent constructor with all the parameters
        if (payload) {
            super(params, payload, offset, params.getProtocolVersionNum(ProtocolVersion.CURRENT), serializer || params.getDefaultSerializer(), payload.length - offset);
        } else {
            super(params);
        }
        
        // Initialize our own properties
        this.parent = parent || null;
    }

    public setParent(parent: Message | null): void {
        if (this.parent !== null && this.parent !== parent && parent !== null) {
            // After old parent is unlinked it won't be able to receive notice if this ChildMessage
            // changes internally.  To be safe we invalidate the parent cache to ensure it rebuilds
            // manually on serialization.
            if (this.parent instanceof ChildMessage) {
                this.parent.unCache();
            } else {
                // For regular Message objects, call the protected unCache method
                (this.parent as any).unCache();
            }
        }
        this.parent = parent;
    }

    public unCache(): void {
        super.unCache();
        if (this.parent !== null) {
            if (this.parent instanceof ChildMessage) {
                this.parent.unCache();
            } else {
                // For regular Message objects, call the protected unCache method
                (this.parent as any).unCache();
            }
        }
    }
    
    public adjustLength(adjustment: number): void;
    public adjustLength(newArraySize: number, adjustment: number): void;
    public adjustLength(...args: any[]): void {
        if (args.length === 1) {
            super.adjustLength(0, args[0]);
        } else if (args.length === 2) {
            super.adjustLength(args[0], args[1]);
        }
        if (this.parent !== null) {
            if (args.length === 1) {
                (this.parent as any).adjustLength(0, args[0]);
            } else if (args.length === 2) {
                (this.parent as any).adjustLength(args[0], args[1]);
            }
        }
    }
}
