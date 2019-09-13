import { Component, OnInit } from '@angular/core';
import { GenericRestDataSourceService } from 'projects/poweredsoft/ngx-data/src/public-api';
import { of } from 'rxjs';
import { DataSource } from '@poweredsoft/data';

export interface ICustomerModel {
  id: number;
  firstName: string;
  lastName: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'ngx-data';
  dataSource: DataSource<ICustomerModel>;

  constructor(genericService: GenericRestDataSourceService) {
    const keyResolver = (model: ICustomerModel) => model.id;

    const transportOptions = genericService.createStandardRestTransportOptions('api/customer', keyResolver);

    this.dataSource = new DataSource<ICustomerModel>({
      resolveIdField: keyResolver,
      transport: transportOptions,
      defaultCriteria: {
        page: 1,
        pageSize: 5,
        groups: [
          { path: 'lastName' }
        ]
      }
    });
  }

  ngOnInit(): void {
    this.dataSource.notifyMessage$.subscribe((notification) => {
      console.log(notification);
    });

    this.dataSource.validationError$.subscribe((notification) => {
      console.log(notification);
    });
  }

  onCreate(): void {
    console.log('excuting command!');
    this.dataSource.executeCommandByName('create', {
      firstName: "",
      lastName: "Baba"
    }).subscribe(() => {

    }, error => {
      //console.log(error);
    });
  }

  onDelete(): void {
    console.log('excuting command!');
    this.dataSource.executeCommandByName('delete', {
      id: 1
    }).subscribe(() => {

    }, error => {
      //console.log(error);
    });
  }
}
