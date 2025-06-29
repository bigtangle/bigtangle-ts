import { PayMultiSign } from './PayMultiSign';

export class PayMultiSignExt extends PayMultiSign {
  
    private realSignnumber: number = 0;

    

    public getRealSignnumber(): number {
        return this.realSignnumber;
    }

    public setRealSignnumber(realSignnumber: number): void {
        this.realSignnumber = realSignnumber;
    }
}